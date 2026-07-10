// Web Worker for fetching and processing news articles

interface SourceInput {
  id: string;
  owner: string;
  repo: string;
  name: string;
  category: string;
  tagFilter?: string;
  feedUrl?: string;
}

interface ArticleOutput {
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

self.addEventListener('message', async (event) => {
  const { type, sources, githubToken } = event.data;

  if (type !== 'fetch') return;

  try {
    const articles: ArticleOutput[] = [];
    const errors: string[] = [];
    let rateLimitExceeded = false;
    let rateLimitReset: string | null = null;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoMs = oneWeekAgo.getTime();

    const fetchPromises: Promise<void>[] = [];

    for (const source of sources as SourceInput[]) {
      // 1. Fetch GitHub Releases
      if (source.owner && source.repo) {
        fetchPromises.push((async () => {
          const url = `https://api.github.com/repos/${source.owner}/${source.repo}/releases?per_page=30`;
          const headers: HeadersInit = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'JS-News-Reader-Worker'
          };

          if (githubToken) {
            headers['Authorization'] = `token ${githubToken}`;
          }

          try {
            const response = await fetch(url, { headers });

            if (response.status === 403) {
              const limit = response.headers.get('X-RateLimit-Remaining');
              if (limit === '0') {
                rateLimitExceeded = true;
                const resetTime = response.headers.get('X-RateLimit-Reset');
                if (resetTime) {
                  rateLimitReset = new Date(parseInt(resetTime, 10) * 1000).toLocaleTimeString();
                }
              }
              throw new Error(`Rate limit exceeded or unauthorized (403)`);
            }

            if (!response.ok) {
              throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!Array.isArray(data)) {
              throw new Error('Invalid response format');
            }

            let count = 0;
            for (const release of data) {
              const tagName = release.tag_name || '';

              if (source.tagFilter) {
                try {
                  const regex = new RegExp(source.tagFilter);
                  if (!regex.test(tagName)) {
                    continue;
                  }
                } catch (err) {
                  if (!tagName.includes(source.tagFilter)) {
                    continue;
                  }
                }
              }

              const publishedAt = release.published_at || new Date().toISOString();
              const publishedTime = new Date(publishedAt).getTime();

              if (publishedTime < oneWeekAgoMs && count >= 4) {
                break;
              }

              const id = `github-${source.owner}-${source.repo}-${release.id}`;
              const title = release.name || `${source.name} ${tagName}`;
              const body = release.body || '';

              let image = '';
              const imgMarkdownRegex = /!\[.*?\]\((https?:\/\/.*?)\)/i;
              const imgHtmlRegex = /<img\s+[^>]*src=["'](https?:\/\/[^"']+)["']/i;
              
              const markdownMatch = body.match(imgMarkdownRegex);
              const htmlMatch = body.match(imgHtmlRegex);

              if (markdownMatch && markdownMatch[1]) {
                image = markdownMatch[1];
              } else if (htmlMatch && htmlMatch[1]) {
                image = htmlMatch[1];
              } else {
                image = `https://opengraph.githubassets.com/1/${source.owner}/${source.repo}`;
              }

              const cleanDesc = cleanMarkdown(body);

              articles.push({
                id,
                sourceId: source.id,
                sourceName: source.name,
                owner: source.owner,
                repo: source.repo,
                title,
                description: cleanDesc,
                url: release.html_url,
                image,
                publishedAt,
                tagName: release.tag_name || 'Release',
                category: source.category
              });

              count++;
            }
          } catch (err: any) {
            errors.push(`${source.name} (GitHub): ${err.message}`);
          }
        })());
      }

      // 2. Fetch Official RSS/Atom Release Feed
      if (source.feedUrl) {
        fetchPromises.push((async () => {
          const url = `/api/feed/rss?url=${encodeURIComponent(source.feedUrl!)}`;
          try {
            const response = await fetch(url);

            if (!response.ok) {
              throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data && Array.isArray(data.items)) {
              let count = 0;
              for (const item of data.items) {
                const publishedAt = item.isoDate || item.pubDate || new Date().toISOString();
                const publishedTime = new Date(publishedAt).getTime();

                if (publishedTime < oneWeekAgoMs && count >= 5) {
                  break;
                }

                const id = `rss-${source.id}-${item.link || item.guid}`;
                const title = item.title || `${source.name} Official Release`;
                
                const rawDesc = item.contentSnippet || item.content || '';
                const cleanDesc = cleanMarkdown(rawDesc);
                
                let image = '';
                if (item.enclosure && item.enclosure.url) {
                  image = item.enclosure.url;
                } else if (item.content) {
                  const imgHtmlRegex = /<img\s+[^>]*src=["'](https?:\/\/[^"']+)["']/i;
                  const htmlMatch = item.content.match(imgHtmlRegex);
                  if (htmlMatch && htmlMatch[1]) {
                    image = htmlMatch[1];
                  }
                }
                
                if (!image) {
                  image = `https://opengraph.githubassets.com/1/${source.owner || 'github'}/${source.repo || 'blog'}`;
                }

                articles.push({
                  id,
                  sourceId: source.id,
                  sourceName: source.name,
                  owner: source.owner || '',
                  repo: source.repo || '',
                  title,
                  description: cleanDesc,
                  url: item.link || '',
                  image,
                  publishedAt,
                  tagName: 'Official Blog',
                  category: source.category
                });

                count++;
              }
            }
          } catch (err: any) {
            errors.push(`${source.name} (Official Blog): ${err.message}`);
          }
        })());
      }
    }

    await Promise.allSettled(fetchPromises);

    // Sort by publication date (newest first)
    articles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    self.postMessage({
      type: 'success',
      articles,
      errors,
      rateLimitExceeded,
      rateLimitReset
    });
  } catch (err: any) {
    self.postMessage({
      type: 'error',
      error: err.message || 'Unknown worker execution error'
    });
  }
});

// Helper function to convert markdown release notes to a plain text summary
function cleanMarkdown(md: string): string {
  if (!md) return '';

  let text = md;

  // 1. Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`([^`]+)`/g, '$1');

  // 2. Remove HTML tags
  text = text.replace(/<[^>]*>/g, '');

  // 3. Remove Markdown headings
  text = text.replace(/^#+\s+/gm, '');

  // 4. Remove Markdown links [text](url) -> text
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');

  // 5. Remove bold/italic markup
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(\*|_)(.*?)\1/g, '$2');

  // 6. Clean up lists and extra whitespaces
  text = text.replace(/^[\s-*+>]+/gm, '');
  text = text.replace(/\n+/g, ' ');

  // 7. Trim and limit length
  text = text.trim();
  const maxLength = 240;
  if (text.length > maxLength) {
    text = text.slice(0, maxLength) + '...';
  }

  return text;
}
