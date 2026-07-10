import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { 
  getSources, 
  getSavedArticles, 
  saveArticle, 
  unsaveArticle, 
  getCachedArticles, 
  setCachedArticles, 
  getGithubToken, 
  setGithubToken,
  saveSource,
  deleteSource,
  resetSources
} from './utils/db.js';
import type { Source, Article } from './utils/db.js';

import './components/news-feed.js';
import './components/saved-articles.js';
import './components/sources-manager.js';

@customElement('my-element')
export class MyElement extends LitElement {
  @state()
  private _activeTab: 'feed' | 'saved' | 'sources' = 'feed';

  @state()
  private _sources: Source[] = [];

  @state()
  private _articles: Article[] = [];

  @state()
  private _savedArticles: Article[] = [];

  @state()
  private _githubToken = '';

  @state()
  private _loading = false;

  @state()
  private _rateLimitExceeded = false;

  @state()
  private _rateLimitReset: string | null = null;

  private _worker: Worker | null = null;

  static styles = css`
    :host {
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --card-footer-bg: rgba(241, 245, 249, 0.5);
      --border: #e2e8f0;
      --text: #475569;
      --text-h: #0f172a;
      --text-muted: #64748b;
      --code-bg: #f1f5f9;
      --accent: #8b5cf6;
      --accent-bg: rgba(139, 92, 246, 0.08);
      --accent-border: rgba(139, 92, 246, 0.3);
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.08);

      --sans: system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

      display: flex;
      flex-direction: row;
      min-height: 100vh;
      width: 100vw;
      background: var(--bg);
      color: var(--text);
      font-family: var(--sans);
      box-sizing: border-box;
    }

    @media (prefers-color-scheme: dark) {
      :host {
        --bg: #090a0f;
        --card-bg: #12131a;
        --card-footer-bg: rgba(18, 19, 26, 0.6);
        --border: #1f2230;
        --text: #94a3b8;
        --text-h: #f8fafc;
        --text-muted: #64748b;
        --code-bg: #1a1c29;
        --accent: #a78bfa;
        --accent-bg: rgba(167, 139, 250, 0.12);
        --accent-border: rgba(167, 139, 250, 0.4);
        --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
        --shadow-md: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2);
      }
    }

    .sidebar {
      width: 260px;
      background: var(--card-bg);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      flex-shrink: 0;
      position: sticky;
      top: 0;
      height: 100vh;
      box-sizing: border-box;
      z-index: 10;
    }

    .brand {
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid var(--border);
    }

    .brand-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, var(--accent), #6366f1);
      color: #ffffff;
      font-weight: 800;
      font-size: 18px;
    }

    .brand-name {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-h);
      letter-spacing: -0.5px;
    }

    .nav-links {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 16px 12px;
      flex-grow: 1;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      color: var(--text);
      text-decoration: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 550;
      background: transparent;
      border: none;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s;
      width: 100%;
    }

    .nav-link:hover {
      background: var(--code-bg);
      color: var(--text-h);
    }

    .nav-link.active {
      background: var(--accent-bg);
      color: var(--accent);
    }

    .nav-link svg {
      width: 18px;
      height: 18px;
      stroke: currentColor;
      stroke-width: 2;
      fill: none;
    }

    .nav-link.active svg {
      stroke: var(--accent);
    }

    .badge-count {
      margin-left: auto;
      font-size: 11px;
      font-weight: 600;
      background: var(--code-bg);
      color: var(--text);
      padding: 2px 6px;
      border-radius: 6px;
      border: 1px solid var(--border);
    }

    .nav-link.active .badge-count {
      background: var(--accent);
      color: #ffffff;
      border-color: var(--accent);
    }

    .sidebar-footer {
      padding: 16px 20px;
      border-top: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 12px;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-muted);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #94a3b8;
    }

    .status-dot.active {
      background: #10b981;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
    }

    .status-dot.loading {
      background: var(--accent);
      animation: pulse-dot 1.5s infinite;
    }

    .status-dot.limited {
      background: #f59e0b;
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.2); }
    }

    .main-content {
      flex-grow: 1;
      height: 100vh;
      overflow-y: auto;
      box-sizing: border-box;
    }

    /* Mobile Header & Bottom Nav (Hidden on Desktop) */
    .mobile-header,
    .mobile-nav {
      display: none;
    }

    @media (max-width: 768px) {
      :host {
        flex-direction: column;
      }
      .sidebar {
        display: none;
      }
      .main-content {
        height: auto;
        padding-bottom: 70px; /* Space for bottom nav */
      }
      .mobile-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 20px;
        background: var(--card-bg);
        border-bottom: 1px solid var(--border);
        position: sticky;
        top: 0;
        z-index: 10;
      }
      .mobile-nav {
        display: flex;
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: var(--card-bg);
        border-top: 1px solid var(--border);
        height: 60px;
        z-index: 10;
        justify-content: space-around;
        align-items: center;
      }
      .mobile-tab-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        background: none;
        border: none;
        color: var(--text-muted);
        font-size: 10px;
        cursor: pointer;
        padding: 8px;
        transition: color 0.2s;
      }
      .mobile-tab-btn.active {
        color: var(--accent);
      }
      .mobile-tab-btn svg {
        width: 20px;
        height: 20px;
        stroke: currentColor;
        stroke-width: 2;
        fill: none;
      }
    }
  `;

  async connectedCallback() {
    super.connectedCallback();
    await this._loadData();
    this._initWorker();
    
    // Auto-fetch in background on load
    this._refreshNews();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._worker) {
      this._worker.terminate();
    }
  }

  render() {
    return html`
      <!-- Mobile Layout Header -->
      <div class="mobile-header">
        <div class="brand">
          <div class="brand-logo">&lt;&gt;</div>
          <span class="brand-name">JS News Hub</span>
        </div>
        <div class="status-indicator">
          <div class="status-dot ${this._getStatusClass()}"></div>
        </div>
      </div>

      <!-- Desktop Sidebar -->
      <aside class="sidebar">
        <div>
          <div class="brand">
            <div class="brand-logo">&lt;&gt;</div>
            <span class="brand-name">JS News Hub</span>
          </div>

          <nav class="nav-links">
            <button 
              class="nav-link ${this._activeTab === 'feed' ? 'active' : ''}" 
              @click="${() => this._activeTab = 'feed'}"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22 6 12 13 2 6"></polyline></svg>
              News Feed
            </button>
            
            <button 
              class="nav-link ${this._activeTab === 'saved' ? 'active' : ''}" 
              @click="${() => this._activeTab = 'saved'}"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
              Bookmarks
              ${this._savedArticles.length > 0 ? html`
                <span class="badge-count">${this._savedArticles.length}</span>
              ` : ''}
            </button>

            <button 
              class="nav-link ${this._activeTab === 'sources' ? 'active' : ''}" 
              @click="${() => this._activeTab = 'sources'}"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              Sources Configuration
            </button>
          </nav>
        </div>

        <div class="sidebar-footer">
          <div class="status-indicator">
            <div class="status-dot ${this._getStatusClass()}"></div>
            <span>${this._getStatusText()}</span>
          </div>
          <div style="color: var(--text-muted)">v1.0.0</div>
        </div>
      </aside>

      <!-- Main Display -->
      <main class="main-content" 
        @refresh-news="${this._refreshNews}"
        @toggle-save="${this._handleToggleSave}"
        @change-tab="${(e: CustomEvent) => this._activeTab = e.detail.tab}"
        @add-source="${this._handleAddSource}"
        @update-source="${this._handleUpdateSource}"
        @delete-source="${this._handleDeleteSource}"
        @save-token="${this._handleSaveToken}"
        @reset-sources="${this._handleResetSources}"
      >
        ${this._activeTab === 'feed' ? html`
          <news-feed 
            .articles="${this._articles}" 
            .savedArticles="${this._savedArticles}"
            .sources="${this._sources}"
            .loading="${this._loading}"
            .rateLimitExceeded="${this._rateLimitExceeded}"
            .rateLimitReset="${this._rateLimitReset}"
          ></news-feed>
        ` : ''}

        ${this._activeTab === 'saved' ? html`
          <saved-articles .savedArticles="${this._savedArticles}"></saved-articles>
        ` : ''}

        ${this._activeTab === 'sources' ? html`
          <sources-manager 
            .sources="${this._sources}" 
            .githubToken="${this._githubToken}"
          ></sources-manager>
        ` : ''}
      </main>

      <!-- Mobile Navigation Bar -->
      <nav class="mobile-nav">
        <button 
          class="mobile-tab-btn ${this._activeTab === 'feed' ? 'active' : ''}" 
          @click="${() => this._activeTab = 'feed'}"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22 6 12 13 2 6"></polyline></svg>
          Feed
        </button>
        <button 
          class="mobile-tab-btn ${this._activeTab === 'saved' ? 'active' : ''}" 
          @click="${() => this._activeTab = 'saved'}"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
          Bookmarks
        </button>
        <button 
          class="mobile-tab-btn ${this._activeTab === 'sources' ? 'active' : ''}" 
          @click="${() => this._activeTab = 'sources'}"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          Sources
        </button>
      </nav>
    `;
  }

  private _getStatusClass(): string {
    if (this._loading) return 'loading';
    if (this._rateLimitExceeded) return 'limited';
    return 'active';
  }

  private _getStatusText(): string {
    if (this._loading) return 'Syncing...';
    if (this._rateLimitExceeded) return 'Rate Limited';
    return 'Sources Synced';
  }

  private async _loadData() {
    this._sources = await getSources();
    this._savedArticles = await getSavedArticles();
    this._githubToken = await getGithubToken();

    const cache = await getCachedArticles();
    if (cache && cache.articles.length > 0) {
      this._articles = cache.articles;
    }
  }

  private _initWorker() {
    // Instantiate background Web Worker with Vite's modern syntax
    this._worker = new Worker(new URL('./news-worker.ts', import.meta.url), { type: 'module' });

    this._worker.addEventListener('message', async (event) => {
      const { type, articles, errors, rateLimitExceeded, rateLimitReset, error } = event.data;

      if (type === 'success') {
        this._loading = false;
        this._rateLimitExceeded = rateLimitExceeded;
        this._rateLimitReset = rateLimitReset;

        if (errors && errors.length > 0) {
          console.warn('News Worker completed with partial errors:', errors);
        }

        if (articles && articles.length > 0) {
          this._articles = articles;
          await setCachedArticles(articles);
        }
      } else if (type === 'error') {
        this._loading = false;
        console.error('News Worker failed:', error);
      }
    });
  }

  private _refreshNews() {
    if (this._loading || !this._worker) return;

    this._loading = true;
    const activeSources = this._sources.filter(s => s.enabled);
    
    this._worker.postMessage({
      type: 'fetch',
      sources: activeSources,
      githubToken: this._githubToken
    });
  }

  private async _handleToggleSave(e: CustomEvent) {
    const { article, saved } = e.detail;

    if (saved) {
      await saveArticle(article);
    } else {
      await unsaveArticle(article.id);
    }

    this._savedArticles = await getSavedArticles();
  }

  private async _handleAddSource(e: CustomEvent) {
    const { source } = e.detail;
    await saveSource(source);
    this._sources = await getSources();
    this._refreshNews();
  }

  private async _handleUpdateSource(e: CustomEvent) {
    const { source } = e.detail;
    await saveSource(source);
    
    // Check if the toggle or filter changed
    const oldSource = this._sources.find(s => s.id === source.id);
    this._sources = await getSources();

    if (oldSource && (oldSource.enabled !== source.enabled || oldSource.tagFilter !== source.tagFilter)) {
      this._refreshNews();
    }
  }

  private async _handleDeleteSource(e: CustomEvent) {
    const { id } = e.detail;
    await deleteSource(id);
    
    const sourceToDelete = this._sources.find(s => s.id === id);
    this._sources = await getSources();

    if (sourceToDelete) {
      // Remove deleted source's articles from feed cache
      const updatedArticles = this._articles.filter(a => a.sourceId !== id);
      this._articles = updatedArticles;
      await setCachedArticles(updatedArticles);
    }
  }

  private async _handleSaveToken(e: CustomEvent) {
    const { token } = e.detail;
    await setGithubToken(token);
    this._githubToken = token;
    
    // Re-fetch since token is updated
    this._refreshNews();
  }

  private async _handleResetSources() {
    this._sources = await resetSources();
    this._refreshNews();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'my-element': MyElement;
  }
}
