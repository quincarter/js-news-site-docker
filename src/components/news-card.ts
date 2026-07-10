import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Article } from '../utils/db.js';

@customElement('news-card')
export class NewsCard extends LitElement {
  @property({ type: Object })
  article!: Article;

  @property({ type: Boolean })
  isSaved = false;

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }

    .card {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--card-bg, #ffffff);
      border: 1px solid var(--border, #e5e4e7);
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.1));
      position: relative;
    }

    .card:hover {
      transform: translateY(-4px);
      border-color: var(--accent, #aa3bff);
      box-shadow: var(--shadow-md, 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05));
    }

    .image-container {
      position: relative;
      width: 100%;
      height: 160px;
      overflow: hidden;
      background: var(--code-bg, #f4f3ec);
      border-bottom: 1px solid var(--border, #e5e4e7);
    }

    .image-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.5s ease;
    }

    .card:hover .image-container img {
      transform: scale(1.05);
    }

    .badge-container {
      position: absolute;
      top: 12px;
      left: 12px;
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      z-index: 2;
    }

    .badge {
      font-size: 11px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      backdrop-filter: blur(8px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .badge-source {
      background: rgba(8, 6, 13, 0.8);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .badge-category {
      background: rgba(170, 59, 255, 0.85);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .tag-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      font-family: var(--mono, monospace);
      font-size: 11px;
      background: var(--code-bg, #f4f3ec);
      color: var(--text-h, #08060d);
      border: 1px solid var(--border, #e5e4e7);
      padding: 4px 8px;
      border-radius: 6px;
      z-index: 2;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .content {
      padding: 16px;
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      gap: 8px;
    }

    .meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: var(--text-muted, #6b6375);
    }

    .time {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .title {
      font-size: 18px;
      font-weight: 600;
      line-height: 140%;
      color: var(--text-h, #08060d);
      margin: 4px 0 0 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 50px;
    }

    .description {
      font-size: 14px;
      line-height: 150%;
      color: var(--text, #6b6375);
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      flex-grow: 1;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-top: 1px solid var(--border, #e5e4e7);
      background: var(--card-footer-bg, rgba(244, 243, 236, 0.2));
      gap: 12px;
    }

    .btn-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      font-weight: 500;
      color: var(--accent, #aa3bff);
      text-decoration: none;
      transition: color 0.2s;
    }

    .btn-link:hover {
      color: var(--text-h, #08060d);
    }

    .btn-bookmark {
      background: none;
      border: none;
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      color: var(--text-muted, #6b6375);
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-bookmark:hover {
      background: var(--accent-bg, rgba(170, 59, 255, 0.1));
      color: var(--accent, #aa3bff);
    }

    .btn-bookmark.saved {
      color: var(--accent, #aa3bff);
    }

    .btn-bookmark.saved svg {
      fill: currentColor;
    }

    .btn-bookmark svg {
      width: 18px;
      height: 18px;
      stroke: currentColor;
      stroke-width: 2;
      fill: none;
      transition: transform 0.2s;
    }

    .btn-bookmark:active svg {
      transform: scale(0.85);
    }

    @media (prefers-color-scheme: dark) {
      .card {
        background: var(--card-bg, #1f2028);
        border-color: var(--border, #2e303a);
      }
      .image-container {
        background: var(--code-bg, #16171d);
        border-bottom-color: var(--border, #2e303a);
      }
      .tag-badge {
        background: var(--code-bg, #16171d);
        color: var(--text-h, #f3f4f6);
        border-color: var(--border, #2e303a);
      }
      .title {
        color: var(--text-h, #f3f4f6);
      }
      .footer {
        border-top-color: var(--border, #2e303a);
        background: var(--card-footer-bg, rgba(31, 32, 40, 0.5));
      }
      .badge-source {
        background: rgba(22, 23, 29, 0.9);
        border-color: rgba(255, 255, 255, 0.05);
      }
      .btn-link:hover {
        color: var(--text-h, #f3f4f6);
      }
    }
  `;

  render() {
    if (!this.article) return html``;

    const publishedDate = new Date(this.article.publishedAt);
    const timeAgoStr = this._timeAgo(publishedDate);

    return html`
      <article class="card">
        <div class="image-container">
          <div class="badge-container">
            <span class="badge badge-source">${this.article.sourceName}</span>
            <span class="badge badge-category">${this.article.category}</span>
          </div>
          <span class="tag-badge">${this.article.tagName}</span>
          <img 
            src="${this.article.image}" 
            alt="${this.article.title} cover"
            loading="lazy"
            @error="${this._handleImageError}"
          />
        </div>
        <div class="content">
          <div class="meta">
            <span class="time">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              ${timeAgoStr}
            </span>
            <span>${publishedDate.toLocaleDateString()}</span>
          </div>
          <h3 class="title" title="${this.article.title}">${this.article.title}</h3>
          <p class="description">${this.article.description || 'No release description available.'}</p>
        </div>
        <div class="footer">
          <a class="btn-link" href="${this.article.url}" target="_blank" rel="noopener noreferrer">
            View Release 
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          </a>
          <button 
            class="btn-bookmark ${this.isSaved ? 'saved' : ''}" 
            @click="${this._toggleSave}"
            title="${this.isSaved ? 'Remove from Saved' : 'Save for Later'}"
            aria-label="${this.isSaved ? 'Remove Bookmark' : 'Bookmark Article'}"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>
        </div>
      </article>
    `;
  }

  private _handleImageError(e: Event) {
    const img = e.target as HTMLImageElement;
    // If the image fails to load (e.g. github open graph rate limits or returns 404),
    // fallback to a clean SVG image of the source or standard gradient
    img.src = `https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=600&auto=format&fit=crop`; // Beautiful default tech wallpaper
  }

  private _toggleSave() {
    this.dispatchEvent(new CustomEvent('toggle-save', {
      detail: {
        article: this.article,
        saved: !this.isSaved
      },
      bubbles: true,
      composed: true
    }));
  }

  private _timeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return `${interval}y ago`;
    
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return `${interval}mo ago`;
    
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return `${interval}d ago`;
    
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return `${interval}h ago`;
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return `${interval}m ago`;
    
    return 'Just now';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'news-card': NewsCard;
  }
}
