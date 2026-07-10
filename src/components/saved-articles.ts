import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Article } from '../utils/db.js';
import './news-card.js';

@customElement('saved-articles')
export class SavedArticles extends LitElement {
  @property({ type: Array })
  savedArticles: Article[] = [];

  @state()
  private _searchQuery = '';

  static styles = css`
    :host {
      display: block;
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      gap: 16px;
      flex-wrap: wrap;
    }

    h2 {
      margin: 0;
      color: var(--text-h, #08060d);
      font-weight: 600;
      font-size: 24px;
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

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 24px;
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
      fill: none;
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

    .btn-action {
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

    .btn-action:hover {
      border-color: var(--accent, #aa3bff);
      color: var(--accent, #aa3bff);
      background: var(--accent-bg, rgba(170, 59, 255, 0.05));
    }

    @media (prefers-color-scheme: dark) {
      h2 {
        color: var(--text-h, #f3f4f6);
      }
      .search-wrapper input {
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
      .btn-action {
        background: var(--card-bg, #1f2028);
        border-color: var(--border, #2e303a);
        color: var(--text-h, #f3f4f6);
      }
    }
  `;

  render() {
    const filtered = this.savedArticles.filter(article => {
      return (
        article.title.toLowerCase().includes(this._searchQuery.toLowerCase()) ||
        (article.description && article.description.toLowerCase().includes(this._searchQuery.toLowerCase())) ||
        article.sourceName.toLowerCase().includes(this._searchQuery.toLowerCase()) ||
        article.tagName.toLowerCase().includes(this._searchQuery.toLowerCase())
      );
    });

    return html`
      <div class="header-bar">
        <h2>Saved Releases (${this.savedArticles.length})</h2>
        
        ${this.savedArticles.length > 0 ? html`
          <div class="search-wrapper">
            <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              placeholder="Search bookmarks..."
              .value="${this._searchQuery}"
              @input="${(e: any) => this._searchQuery = e.target.value}"
            />
          </div>
        ` : ''}
      </div>

      ${this.savedArticles.length === 0 ? html`
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          <h3>No bookmarked releases</h3>
          <p>
            When you're browsing the main feed, click the bookmark icon on any release to save it here for quick reference offline.
          </p>
          <button class="btn-action" @click="${this._goToFeed}">Browse Releases</button>
        </div>
      ` : filtered.length === 0 ? html`
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <h3>No matching bookmarks</h3>
          <p>
            No saved releases match your search query "${this._searchQuery}".
          </p>
          <button class="btn-action" @click="${this._clearSearch}">Clear Search</button>
        </div>
      ` : html`
        <div class="grid">
          ${filtered.map(article => html`
            <news-card 
              .article="${article}" 
              .isSaved="${true}"
              @toggle-save="${this._handleToggleSave}"
            ></news-card>
          `)}
        </div>
      `}
    `;
  }

  private _goToFeed() {
    this.dispatchEvent(new CustomEvent('change-tab', {
      detail: { tab: 'feed' },
      bubbles: true,
      composed: true
    }));
  }

  private _clearSearch() {
    this._searchQuery = '';
  }

  private _handleToggleSave(e: CustomEvent) {
    this.dispatchEvent(new CustomEvent('toggle-save', {
      detail: e.detail,
      bubbles: true,
      composed: true
    }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'saved-articles': SavedArticles;
  }
}
