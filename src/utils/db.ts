export interface Source {
  id: string;
  owner: string;
  repo: string;
  name: string;
  enabled: boolean;
  category: string;
  tagFilter?: string;
  feedUrl?: string;
}

export interface Article {
  id: string;
  sourceId: string;
  sourceName: string;
  owner: string;
  repo: string;
  title: string;
  description: string;
  url: string;
  image: string;
  publishedAt: string;
  tagName: string;
  category: string;
}

const DB_NAME = 'js-news-sources-db';
const DB_VERSION = 1;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('sources')) {
        db.createObjectStore('sources', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('saved_articles')) {
        db.createObjectStore('saved_articles', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
  });
}

// Default sources configuration
export const DEFAULT_SOURCES: Source[] = [
  { id: 'node', owner: 'nodejs', repo: 'node', name: 'Node.js', enabled: true, category: 'Runtime', feedUrl: 'https://nodejs.org/en/feed/releases.xml' },
  { id: 'npm', owner: 'npm', repo: 'cli', name: 'npm', enabled: true, category: 'Tooling', tagFilter: '^v\\d+' },
  { id: 'lit', owner: 'lit', repo: 'lit', name: 'Lit', enabled: true, category: 'Framework', feedUrl: 'https://lit.dev/blog/atom.xml' },
  { id: 'angular', owner: 'angular', repo: 'angular', name: 'Angular', enabled: true, category: 'Framework', feedUrl: 'https://blog.angular.dev/feed' },
  { id: 'react', owner: 'facebook', repo: 'react', name: 'React', enabled: true, category: 'Framework', feedUrl: 'https://react.dev/rss.xml' },
  { id: 'vue', owner: 'vuejs', repo: 'core', name: 'Vue', enabled: true, category: 'Framework', feedUrl: 'https://blog.vuejs.org/feed.xml' },
  { id: 'vite', owner: 'vitejs', repo: 'vite', name: 'Vite', enabled: true, category: 'Tooling', feedUrl: 'https://vite.dev/blog.rss' },
  { id: 'oxc', owner: 'oxc-project', repo: 'oxc', name: 'Oxc', enabled: true, category: 'Tooling' },
  { id: 'biome', owner: 'biomejs', repo: 'biome', name: 'Biome', enabled: true, category: 'Tooling', feedUrl: 'https://biomejs.dev/blog/feed.xml' },
  { id: 'nextjs', owner: 'vercel', repo: 'next.js', name: 'Next.js', enabled: true, category: 'Framework', feedUrl: 'https://nextjs.org/feed.xml' },
  { id: 'yarn', owner: 'yarnpkg', repo: 'berry', name: 'Yarn', enabled: true, category: 'Tooling' },
  { id: 'bun', owner: 'oven-sh', repo: 'bun', name: 'Bun', enabled: true, category: 'Runtime', feedUrl: 'https://bun.sh/rss.xml' },
  { id: 'deno', owner: 'denoland', repo: 'deno', name: 'Deno', enabled: true, category: 'Runtime', feedUrl: 'https://deno.com/feed' },
  { id: 'typescript', owner: 'microsoft', repo: 'TypeScript', name: 'TypeScript', enabled: true, category: 'Language' },
  { id: 'svelte', owner: 'sveltejs', repo: 'svelte', name: 'Svelte', enabled: true, category: 'Framework', feedUrl: 'https://svelte.dev/blog/rss.xml' },
  { id: 'tailwind', owner: 'tailwindlabs', repo: 'tailwindcss', name: 'Tailwind CSS', enabled: true, category: 'Tooling', feedUrl: 'https://tailwindcss.com/feeds/feed.xml' },
  { id: 'github-changelog', owner: 'github', repo: 'changelog', name: 'GitHub Changelog', enabled: true, category: 'Tooling', feedUrl: 'https://github.blog/changelog/feed/' }
];

// --- Backend Integration Configuration ---
const API_URL = (import.meta.env.VITE_API_URL as string) || (import.meta.env.DEV ? 'http://localhost:3000' : '');

// --- Local IndexedDB Helpers (for offline fallback & caching) ---

async function getLocalSources(): Promise<Source[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('sources', 'readonly');
    const store = transaction.objectStore('sources');
    const request = store.getAll();

    request.onsuccess = async () => {
      const sources = request.result;
      if (sources.length === 0) {
        await populateLocalDefaultSources();
        resolve(DEFAULT_SOURCES);
      } else {
        resolve(sources);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

async function populateLocalDefaultSources(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('sources', 'readwrite');
    const store = transaction.objectStore('sources');
    for (const source of DEFAULT_SOURCES) {
      store.put(source);
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function saveLocalSource(source: Source): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('sources', 'readwrite');
    const store = transaction.objectStore('sources');
    const request = store.put(source);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function deleteLocalSource(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('sources', 'readwrite');
    const store = transaction.objectStore('sources');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function resetLocalSources(): Promise<Source[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('sources', 'readwrite');
    const store = transaction.objectStore('sources');
    const clearRequest = store.clear();

    clearRequest.onsuccess = () => {
      for (const source of DEFAULT_SOURCES) {
        store.put(source);
      }
    };

    transaction.oncomplete = () => resolve(DEFAULT_SOURCES);
    transaction.onerror = () => reject(transaction.error);
  });
}

async function getLocalSavedArticles(): Promise<Article[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('saved_articles', 'readonly');
    const store = transaction.objectStore('saved_articles');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveLocalArticle(article: Article): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('saved_articles', 'readwrite');
    const store = transaction.objectStore('saved_articles');
    const request = store.put(article);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function unsaveLocalArticle(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('saved_articles', 'readwrite');
    const store = transaction.objectStore('saved_articles');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getLocalCachedArticles(): Promise<{ timestamp: number; articles: Article[] } | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('cache', 'readonly');
    const store = transaction.objectStore('cache');
    const request = store.get('cached_news');
    request.onsuccess = () => {
      if (request.result) {
        resolve({
          timestamp: request.result.timestamp,
          articles: request.result.articles
        });
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

async function setLocalCachedArticles(articles: Article[]): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('cache', 'readwrite');
    const store = transaction.objectStore('cache');
    const request = store.put({
      key: 'cached_news',
      timestamp: Date.now(),
      articles
    });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getLocalGithubToken(): Promise<string> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('settings', 'readonly');
    const store = transaction.objectStore('settings');
    const request = store.get('github_token');
    request.onsuccess = () => {
      resolve(request.result ? request.result.value : '');
    };
    request.onerror = () => reject(request.error);
  });
}

async function setLocalGithubToken(token: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('settings', 'readwrite');
    const store = transaction.objectStore('settings');
    const request = store.put({
      key: 'github_token',
      value: token
    });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// --- Public APIs with Backend sync and Fallback to IndexedDB ---

export async function getSources(): Promise<Source[]> {
  try {
    const response = await fetch(`${API_URL}/api/sources`);
    if (response.ok) {
      const sources: Source[] = await response.json();
      // Sync with local IndexedDB
      const db = await initDB();
      const transaction = db.transaction('sources', 'readwrite');
      const store = transaction.objectStore('sources');
      await store.clear();
      for (const s of sources) {
        store.put(s);
      }
      return sources;
    }
  } catch (err) {
    console.warn('Failed to fetch sources from backend. Falling back to local IndexedDB.', err);
  }
  return getLocalSources();
}

export async function saveSource(source: Source): Promise<void> {
  // Always update locally first for responsiveness
  await saveLocalSource(source);
  try {
    const response = await fetch(`${API_URL}/api/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(source)
    });
    if (!response.ok) {
      console.error('Server error saving source:', await response.text());
    }
  } catch (err) {
    console.warn('Failed to save source to backend. Saved locally only.', err);
  }
}

export async function deleteSource(id: string): Promise<void> {
  await deleteLocalSource(id);
  try {
    const response = await fetch(`${API_URL}/api/sources/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      console.error('Server error deleting source:', await response.text());
    }
  } catch (err) {
    console.warn('Failed to delete source from backend. Deleted locally only.', err);
  }
}

export async function resetSources(): Promise<Source[]> {
  try {
    const response = await fetch(`${API_URL}/api/sources/reset`, {
      method: 'POST'
    });
    if (response.ok) {
      const sources: Source[] = await response.json();
      // Sync local db
      const db = await initDB();
      const transaction = db.transaction('sources', 'readwrite');
      const store = transaction.objectStore('sources');
      await store.clear();
      for (const s of sources) {
        store.put(s);
      }
      return sources;
    }
  } catch (err) {
    console.warn('Failed to reset sources on backend. Resetting locally.', err);
  }
  return resetLocalSources();
}

export async function getSavedArticles(): Promise<Article[]> {
  try {
    const response = await fetch(`${API_URL}/api/saved-articles`);
    if (response.ok) {
      const articles: Article[] = await response.json();
      // Sync local db
      const db = await initDB();
      const transaction = db.transaction('saved_articles', 'readwrite');
      const store = transaction.objectStore('saved_articles');
      await store.clear();
      for (const a of articles) {
        store.put(a);
      }
      return articles;
    }
  } catch (err) {
    console.warn('Failed to fetch saved articles from backend. Falling back to local IndexedDB.', err);
  }
  return getLocalSavedArticles();
}

export async function saveArticle(article: Article): Promise<void> {
  await saveLocalArticle(article);
  try {
    const response = await fetch(`${API_URL}/api/saved-articles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(article)
    });
    if (!response.ok) {
      console.error('Server error saving article:', await response.text());
    }
  } catch (err) {
    console.warn('Failed to save article to backend. Saved locally only.', err);
  }
}

export async function unsaveArticle(id: string): Promise<void> {
  await unsaveLocalArticle(id);
  try {
    const response = await fetch(`${API_URL}/api/saved-articles/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      console.error('Server error unsaving article:', await response.text());
    }
  } catch (err) {
    console.warn('Failed to unsave article on backend. Deleted locally only.', err);
  }
}

export async function getCachedArticles(): Promise<{ timestamp: number; articles: Article[] } | null> {
  try {
    const response = await fetch(`${API_URL}/api/cache/articles`);
    if (response.ok) {
      const data = await response.json();
      if (data) {
        // Sync local db
        const db = await initDB();
        const transaction = db.transaction('cache', 'readwrite');
        const store = transaction.objectStore('cache');
        await store.put({
          key: 'cached_news',
          timestamp: data.timestamp,
          articles: data.articles
        });
        return data;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch cached articles from backend. Falling back to local IndexedDB.', err);
  }
  return getLocalCachedArticles();
}

export async function setCachedArticles(articles: Article[]): Promise<void> {
  await setLocalCachedArticles(articles);
  try {
    const response = await fetch(`${API_URL}/api/cache/articles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: Date.now(),
        articles
      })
    });
    if (!response.ok) {
      console.error('Server error caching articles:', await response.text());
    }
  } catch (err) {
    console.warn('Failed to save cached articles to backend. Saved locally only.', err);
  }
}

export async function getGithubToken(): Promise<string> {
  try {
    const response = await fetch(`${API_URL}/api/settings/github-token`);
    if (response.ok) {
      const data = await response.json();
      const token = data.value || '';
      await setLocalGithubToken(token);
      return token;
    }
  } catch (err) {
    console.warn('Failed to fetch github token from backend. Falling back to local IndexedDB.', err);
  }
  return getLocalGithubToken();
}

export async function setGithubToken(token: string): Promise<void> {
  await setLocalGithubToken(token);
  try {
    const response = await fetch(`${API_URL}/api/settings/github-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: token })
    });
    if (!response.ok) {
      console.error('Server error saving github token:', await response.text());
    }
  } catch (err) {
    console.warn('Failed to save github token to backend. Saved locally only.', err);
  }
}
