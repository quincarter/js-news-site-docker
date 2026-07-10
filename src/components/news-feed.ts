import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Article, Source } from '../utils/db.js';
import './news-card.js';

@customElement('news-feed')
export class NewsFeed extends LitElement {
  @property({ type: Array })
  articles: Article[] = [];

  @property({ type: Array })
  savedArticles: Article[] = [];

  @property({ type: Array })
  sources: Source[] = [];

  @property({ type: Boolean })
  loading = false;

  @property({ type: Boolean })
  rateLimitExceeded = false;

  @property({ type: String })
  rateLimitReset: string | null = null;

  @state()
  private _searchQuery = '';

  @state()
  private _selectedCategory = 'All';

  @state()
  private _selectedSource = 'All';

  @state()
  private _selectedType = 'All'; // 'All' | 'Official' | 'Github'

  @state()
  private _visibleCount = 12;

  static styles = css`
    :host {
      display: block;
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .filters {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
      flex-grow: 1;
    }

    .search-wrapper {
      position: relative;
      min-width: 250px;
      flex-grow: 1;
      max-width: 400px;
    }

    .search-wrapper input {
      width: 100%;
      padding: 10px 12px 10px 38px;
      border: 1px solid var(--border, #e5e4e7);
      border-radius: 8px;
      background: var(--card-bg, #fff);
      color: var(--text-h, #08060d);
      font-family: inherit;
      font-size: 14px;
      box-sizing: border-box;
      transition: all 0.2s;
    }

    .search-wrapper input:focus {
      outline: none;
      border-color: var(--accent, #aa3bff);
      box-shadow: 0 0 0 3px var(--accent-bg, rgba(170, 59, 255, 0.1));
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted, #6b6375);
      pointer-events: none;
      width: 16px;
      height: 16px;
    }

    .filter-select {
      padding: 10px 12px;
      border: 1px solid var(--border, #e5e4e7);
      border-radius: 8px;
      background: var(--card-bg, #fff);
      color: var(--text-h, #08060d);
      font-family: inherit;
      font-size: 14px;
      cursor: pointer;
      min-width: 140px;
      transition: all 0.2s;
    }

    .filter-select:focus {
      outline: none;
      border-color: var(--accent, #aa3bff);
    }

    .actions {
      display: flex;
      gap: 12px;
    }

    .btn-refresh {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      border: 1px solid var(--border, #e5e4e7);
      background: var(--card-bg, #fff);
      color: var(--text-h, #08060d);
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-refresh:hover {
      border-color: var(--accent, #aa3bff);
      color: var(--accent, #aa3bff);
      background: var(--accent-bg, rgba(170, 59, 255, 0.05));
    }

    .btn-refresh.spinning svg {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    .rate-limit-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 24px;
      color: var(--text-h, #08060d);
      font-size: 14px;
    }

    .rate-limit-banner svg {
      color: rgb(245, 158, 11);
      flex-shrink: 0;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }

    /* Skeleton Loading Cards */
    .skeleton-card {
      display: flex;
      flex-direction: column;
      height: 380px;
      background: var(--card-bg, #ffffff);
      border: 1px solid var(--border, #e5e4e7);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.1));
    }

    .skeleton-image {
      width: 100%;
      height: 160px;
      background: var(--border, #e5e4e7);
      position: relative;
    }

    .skeleton-content {
      padding: 16px;
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      gap: 12px;
    }

    .skeleton-text {
      height: 14px;
      background: var(--border, #e5e4e7);
      border-radius: 4px;
    }

    .skeleton-title {
      height: 24px;
      width: 85%;
      background: var(--border, #e5e4e7);
      border-radius: 6px;
    }

    .skeleton-desc-1 { height: 12px; width: 100%; }
    .skeleton-desc-2 { height: 12px; width: 95%; }
    .skeleton-desc-3 { height: 12px; width: 70%; }

    .pulse {
      animation: pulse-animation 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes pulse-animation {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .load-more-container {
      display: flex;
      justify-content: center;
      margin-top: 24px;
    }

    .btn-load-more {
      padding: 10px 24px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      border: 1px solid var(--border, #e5e4e7);
      background: var(--card-bg, #ffffff);
      color: var(--text-h, #08060d);
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-load-more:hover {
      border-color: var(--accent, #aa3bff);
      color: var(--accent, #aa3bff);
      background: var(--accent-bg, rgba(170, 59, 255, 0.05));
    }

    .feed-tabs {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--border, #e5e4e7);
      padding-bottom: 8px;
    }

    .feed-tab {
      padding: 8px 12px;
      font-size: 14px;
      font-weight: 600;
      background: transparent;
      border: none;
      color: var(--text-muted, #6b6375);
      cursor: pointer;
      position: relative;
      transition: all 0.2s;
    }

    .feed-tab:hover {
      color: var(--text-h, #08060d);
    }

    .feed-tab.active {
      color: var(--accent, #aa3bff);
    }

    .feed-tab.active::after {
      content: '';
      position: absolute;
      bottom: -9px;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--accent, #aa3bff);
      border-radius: 2px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 24px;
      text-align: center;
      border: 1px dashed var(--border, #e5e4e7);
      border-radius: 12px;
      background: var(--card-bg, rgba(255, 255, 255, 0.5));
      color: var(--text-muted, #6b6375);
    }

    .empty-state svg {
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      stroke: currentColor;
      stroke-width: 1.5;
    }

    .empty-state h3 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--text-h, #08060d);
    }

    .empty-state p {
      font-size: 14px;
      max-width: 400px;
      margin-bottom: 16px;
    }

    @media (prefers-color-scheme: dark) {
      .feed-tabs {
        border-bottom-color: var(--border, #2e303a);
      }
      .feed-tab {
        color: var(--text-muted, #9ca3af);
      }
      .feed-tab:hover {
        color: var(--text-h, #f3f4f6);
      }
      .feed-tab.active {
        color: var(--accent, #a78bfa);
      }
      .feed-tab.active::after {
        background: var(--accent, #a78bfa);
      }
      .search-wrapper input {
        background: var(--card-bg, #1f2028);
        border-color: var(--border, #2e303a);
        color: var(--text-h, #f3f4f6);
      }
      .filter-select {
        background: var(--card-bg, #1f2028);
        border-color: var(--border, #2e303a);
        color: var(--text-h, #f3f4f6);
      }
      .btn-refresh {
        background: var(--card-bg, #1f2028);
        border-color: var(--border, #2e303a);
        color: var(--text-h, #f3f4f6);
      }
      .skeleton-card {
        background: var(--card-bg, #1f2028);
        border-color: var(--border, #2e303a);
      }
      .skeleton-image, .skeleton-text, .skeleton-title, .skeleton-desc-1, .skeleton-desc-2, .skeleton-desc-3 {
        background: var(--border, #2e303a);
      }
      .btn-load-more {
        background: var(--card-bg, #1f2028);
        border-color: var(--border, #2e303a);
        color: var(--text-h, #f3f4f6);
      }
      .empty-state {
        border-color: var(--border, #2e303a);
        background: var(--card-bg, rgba(31, 32, 40, 0.5));
        color: var(--text-muted, #9ca3af);
      }
      .empty-state h3 {
        color: var(--text-h, #f3f4f6);
      }
    }
  `;

  render() {
    const activeSources = this.sources.filter(s => s.enabled);
    
    // Perform Filtering
    const filtered = this.articles.filter(article => {
      const matchesSearch = 
        article.title.toLowerCase().includes(this._searchQuery.toLowerCase()) ||
        (article.description && article.description.toLowerCase().includes(this._searchQuery.toLowerCase())) ||
        article.sourceName.toLowerCase().includes(this._searchQuery.toLowerCase()) ||
        article.tagName.toLowerCase().includes(this._searchQuery.toLowerCase());
      
      const matchesCategory = 
        this._selectedCategory === 'All' || 
        article.category === this._selectedCategory;
      
      const matchesSource = 
        this._selectedSource === 'All' || 
        article.sourceId === this._selectedSource;

      const matchesType = 
        this._selectedType === 'All' || 
        (this._selectedType === 'Official' && article.id.startsWith('rss-')) ||
        (this._selectedType === 'Github' && article.id.startsWith('github-'));

      return matchesSearch && matchesCategory && matchesSource && matchesType;
    });

    const categories = ['All', ...new Set(this.articles.map(a => a.category))];
    const visibleArticles = filtered.slice(0, this._visibleCount);

    return html`
      <!-- Feed Tabs -->
      <div class="feed-tabs">
        <button 
          class="feed-tab ${this._selectedType === 'All' ? 'active' : ''}" 
          @click="${() => { this._selectedType = 'All'; this._visibleCount = 12; }}"
        >
          All Releases
        </button>
        <button 
          class="feed-tab ${this._selectedType === 'Official' ? 'active' : ''}" 
          @click="${() => { this._selectedType = 'Official'; this._visibleCount = 12; }}"
        >
          Official Product Logs
        </button>
        <button 
          class="feed-tab ${this._selectedType === 'Github' ? 'active' : ''}" 
          @click="${() => { this._selectedType = 'Github'; this._visibleCount = 12; }}"
        >
          GitHub Tags
        </button>
      </div>

      <!-- Rate Limit Alert -->
      ${this.rateLimitExceeded ? html`
        <div class="rate-limit-banner">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          <div>
            <strong>GitHub API Rate Limit Exceeded:</strong> You've temporarily run out of anonymous requests. 
            ${this.rateLimitReset ? html`It will reset at <strong>${this.rateLimitReset}</strong>.` : ''} 
            Please add a Personal Access Token in the "Sources" tab to bypass this limit.
          </div>
        </div>
      ` : ''}

      <!-- Toolbar / Filters -->
      <div class="toolbar">
        <div class="filters">
          <div class="search-wrapper">
            <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              placeholder="Search release notes, projects, tags..."
              .value="${this._searchQuery}"
              @input="${(e: any) => { this._searchQuery = e.target.value; this._visibleCount = 12; }}"
            />
          </div>

          <select 
            class="filter-select" 
            .value="${this._selectedCategory}"
            @change="${(e: any) => { this._selectedCategory = e.target.value; this._visibleCount = 12; }}"
            title="Filter by technology category"
          >
            <option value="All">All Categories</option>
            ${categories.filter(c => c !== 'All').map(cat => html`
              <option value="${cat}">${cat}</option>
            `)}
          </select>

          <select 
            class="filter-select" 
            .value="${this._selectedSource}"
            @change="${(e: any) => { this._selectedSource = e.target.value; this._visibleCount = 12; }}"
            title="Filter by news source"
          >
            <option value="All">All Sources</option>
            ${activeSources.map(src => html`
              <option value="${src.id}">${src.name}</option>
            `)}
          </select>
        </div>

        <div class="actions">
          <button 
            class="btn-refresh ${this.loading ? 'spinning' : ''}" 
            @click="${this._handleRefresh}"
            title="Check for new releases"
            ?disabled="${this.loading}"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
          </button>
        </div>
      </div>

      <!-- Feed Grid -->
      ${this.loading && this.articles.length === 0 ? html`
        <div class="grid">
          ${Array(6).fill(0).map(() => html`
            <div class="skeleton-card">
              <div class="skeleton-image pulse"></div>
              <div class="skeleton-content">
                <div style="display: flex; justify-content: space-between;">
                  <div class="skeleton-text pulse" style="width: 30%;"></div>
                  <div class="skeleton-text pulse" style="width: 20%;"></div>
                </div>
                <div class="skeleton-title pulse" style="margin-top: 8px;"></div>
                <div class="skeleton-text skeleton-desc-1 pulse" style="margin-top: 12px;"></div>
                <div class="skeleton-text skeleton-desc-2 pulse"></div>
                <div class="skeleton-text skeleton-desc-3 pulse"></div>
              </div>
            </div>
          `)}
        </div>
      ` : filtered.length === 0 ? html`
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
          <h3>No releases found</h3>
          <p>
            ${activeSources.length === 0 
              ? 'You have disabled all sources! Please head to the "Sources" tab and enable some sources.' 
              : 'Try adjusting your search filters or click the refresh button to retrieve the latest releases.'}
          </p>
          ${activeSources.length === 0 ? html`
            <button class="btn-load-more" @click="${this._goToSources}">Go to Sources Configuration</button>
          ` : html`
            <button class="btn-load-more" @click="${this._clearFilters}">Reset Filters</button>
          `}
        </div>
      ` : html`
        <div class="grid">
          ${visibleArticles.map(article => html`
            <news-card 
              .article="${article}" 
              .isSaved="${this.savedArticles.some(a => a.id === article.id)}"
              @toggle-save="${this._handleToggleSave}"
            ></news-card>
          `)}
        </div>

        ${filtered.length > this._visibleCount ? html`
          <div class="load-more-container">
            <button class="btn-load-more" @click="${this._loadMore}">
              Load More Releases (${filtered.length - this._visibleCount} remaining)
            </button>
          </div>
        ` : ''}
      `}
    `;
  }

  private _handleRefresh() {
    this.dispatchEvent(new CustomEvent('refresh-news', {
      bubbles: true,
      composed: true
    }));
  }

  private _handleToggleSave(e: CustomEvent) {
    // Just pass up
    this.dispatchEvent(new CustomEvent('toggle-save', {
      detail: e.detail,
      bubbles: true,
      composed: true
    }));
  }

  private _loadMore() {
    this._visibleCount += 12;
  }

  private _clearFilters() {
    this._searchQuery = '';
    this._selectedCategory = 'All';
    this._selectedSource = 'All';
    this._visibleCount = 12;
  }

  private _goToSources() {
    this.dispatchEvent(new CustomEvent('change-tab', {
      detail: { tab: 'sources' },
      bubbles: true,
      composed: true
    }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'news-feed': NewsFeed;
  }
}
