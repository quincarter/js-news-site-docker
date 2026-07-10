import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

export const pool = new pg.Pool(
  connectionString
    ? { connectionString }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'news_sources',
      }
);

// Initial default sources to insert if table is empty
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

export async function initDatabase() {
  console.log('Initializing database tables...');
  
  // Retry mechanism for database connection
  let retries = 5;
  while (retries > 0) {
    try {
      await pool.query('SELECT 1');
      break;
    } catch (err) {
      console.log(`Database not ready yet. Retrying in 2 seconds... (${retries} retries left)`);
      retries -= 1;
      if (retries === 0) {
        throw err;
      }
      await new Promise(res => setTimeout(res, 2000));
    }
  }

  // Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sources (
      "id" VARCHAR(255) PRIMARY KEY,
      "owner" VARCHAR(255) NOT NULL,
      "repo" VARCHAR(255) NOT NULL,
      "name" VARCHAR(255) NOT NULL,
      "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
      "category" VARCHAR(255) NOT NULL,
      "tagFilter" VARCHAR(255),
      "feedUrl" VARCHAR(500)
    );
  `);

  // Ensure "feedUrl" column is added to existing database schema
  await pool.query(`
    ALTER TABLE sources ADD COLUMN IF NOT EXISTS "feedUrl" VARCHAR(500);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS saved_articles (
      "id" VARCHAR(255) PRIMARY KEY,
      "sourceId" VARCHAR(255) NOT NULL,
      "sourceName" VARCHAR(255) NOT NULL,
      "owner" VARCHAR(255) NOT NULL,
      "repo" VARCHAR(255) NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "url" TEXT NOT NULL,
      "image" TEXT NOT NULL,
      "publishedAt" VARCHAR(255) NOT NULL,
      "tagName" VARCHAR(255) NOT NULL,
      "category" VARCHAR(255) NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cache (
      "key" VARCHAR(255) PRIMARY KEY,
      "timestamp" BIGINT NOT NULL,
      "articles" JSONB NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      "key" VARCHAR(255) PRIMARY KEY,
      "value" TEXT NOT NULL
    );
  `);

  console.log('Seeding and updating default sources...');
  for (const s of DEFAULT_SOURCES) {
    await pool.query(
      `INSERT INTO sources (id, owner, repo, name, enabled, category, "tagFilter", "feedUrl")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE 
       SET "feedUrl" = COALESCE(sources."feedUrl", EXCLUDED."feedUrl")`,
      [s.id, s.owner, s.repo, s.name, s.enabled, s.category, s.tagFilter || null, s.feedUrl || null]
    );
  }

  console.log('Database initialization complete.');
}
