import express from 'express';
import cors from 'cors';
import { initDatabase, pool } from './db.js';
import Parser from 'rss-parser';

const parser = new Parser();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support larger payloads (cached news can be large)

// Default sources to seed/reset
const DEFAULT_SOURCES = [
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

// Sources Endpoint
app.get('/api/sources', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sources');
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching sources:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sources', async (req, res) => {
  const { id, owner, repo, name, enabled, category, tagFilter, feedUrl } = req.body;
  try {
    await pool.query(
      `INSERT INTO sources (id, owner, repo, name, enabled, category, "tagFilter", "feedUrl")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE 
       SET owner = EXCLUDED.owner, repo = EXCLUDED.repo, name = EXCLUDED.name, 
           enabled = EXCLUDED.enabled, category = EXCLUDED.category, "tagFilter" = EXCLUDED."tagFilter",
           "feedUrl" = EXCLUDED."feedUrl"`,
      [id, owner, repo, name, enabled ?? true, category, tagFilter || null, feedUrl || null]
    );
    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Error saving source:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sources/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM sources WHERE id = $1', [id]);
    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Error deleting source:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sources/reset', async (req, res) => {
  try {
    await pool.query('BEGIN');
    await pool.query('DELETE FROM sources');
    for (const s of DEFAULT_SOURCES) {
      await pool.query(
        `INSERT INTO sources (id, owner, repo, name, enabled, category, "tagFilter", "feedUrl")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [s.id, s.owner, s.repo, s.name, s.enabled, s.category, s.tagFilter || null, s.feedUrl || null]
      );
    }
    await pool.query('COMMIT');
    res.status(200).json(DEFAULT_SOURCES);
  } catch (err: any) {
    await pool.query('ROLLBACK');
    console.error('Error resetting sources:', err);
    res.status(500).json({ error: err.message });
  }
});

// RSS Feed Proxy Endpoint
app.get('/api/feed/rss', async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL query parameter is required' });
  }
  try {
    const feed = await parser.parseURL(url);
    res.json(feed);
  } catch (err: any) {
    console.error(`Error parsing feed from URL ${url}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// Saved Articles Endpoint
app.get('/api/saved-articles', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM saved_articles');
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching saved articles:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/saved-articles', async (req, res) => {
  const { 
    id, sourceId, sourceName, owner, repo, title, 
    description, url, image, publishedAt, tagName, category 
  } = req.body;
  try {
    await pool.query(
      `INSERT INTO saved_articles (id, "sourceId", "sourceName", owner, repo, title, description, url, image, "publishedAt", "tagName", category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE 
       SET "sourceId" = EXCLUDED."sourceId", "sourceName" = EXCLUDED."sourceName", 
           owner = EXCLUDED.owner, repo = EXCLUDED.repo, title = EXCLUDED.title, 
           description = EXCLUDED.description, url = EXCLUDED.url, image = EXCLUDED.image, 
           "publishedAt" = EXCLUDED."publishedAt", "tagName" = EXCLUDED."tagName", 
           category = EXCLUDED.category`,
      [id, sourceId, sourceName, owner, repo, title, description, url, image, publishedAt, tagName, category]
    );
    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Error saving article:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/saved-articles/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM saved_articles WHERE id = $1', [id]);
    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Error unsaving article:', err);
    res.status(500).json({ error: err.message });
  }
});

// Cache Endpoint
app.get('/api/cache/articles', async (req, res) => {
  try {
    const result = await pool.query('SELECT timestamp, articles FROM cache WHERE key = \'cached_news\'');
    if (result.rows.length > 0) {
      res.json({
        timestamp: Number(result.rows[0].timestamp),
        articles: result.rows[0].articles
      });
    } else {
      res.json(null);
    }
  } catch (err: any) {
    console.error('Error fetching cache:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cache/articles', async (req, res) => {
  const { timestamp, articles } = req.body;
  try {
    await pool.query(
      `INSERT INTO cache (key, timestamp, articles)
       VALUES ('cached_news', $1, $2)
       ON CONFLICT (key) DO UPDATE 
       SET timestamp = EXCLUDED.timestamp, articles = EXCLUDED.articles`,
      [timestamp, JSON.stringify(articles)]
    );
    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Error saving cache:', err);
    res.status(500).json({ error: err.message });
  }
});

// Settings Endpoint
app.get('/api/settings/github-token', async (req, res) => {
  try {
    const result = await pool.query('SELECT value FROM settings WHERE key = \'github_token\'');
    if (result.rows.length > 0) {
      res.json({ value: result.rows[0].value });
    } else {
      res.json({ value: '' });
    }
  } catch (err: any) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings/github-token', async (req, res) => {
  const { value } = req.body;
  try {
    await pool.query(
      `INSERT INTO settings (key, value)
       VALUES ('github_token', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [value]
    );
    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Error saving token:', err);
    res.status(500).json({ error: err.message });
  }
});

// Start server after initializing tables
async function start() {
  try {
    await initDatabase();
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
