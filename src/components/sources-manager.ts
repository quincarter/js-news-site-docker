import { LitElement, html, css } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import type { Source } from '../utils/db.js';

@customElement('sources-manager')
export class SourcesManager extends LitElement {
  @property({ type: Array })
  sources: Source[] = [];

  @property({ type: String })
  githubToken = '';

  @state()
  private _newOwner = '';

  @state()
  private _newRepo = '';

  @state()
  private _newName = '';

  @state()
  private _newCategory = 'Framework';

  @state()
  private _newTagFilter = '';

  @state()
  private _newFeedUrl = '';

  @state()
  private _tokenInput = '';

  @state()
  private _searchQuery = '';

  @state()
  private _activeTab: 'all' | 'enabled' | 'disabled' = 'all';

  @state()
  private _formError = '';

  @state()
  private _tokenSaved = false;

  @query('#token-field')
  tokenField!: HTMLInputElement;

  static styles = css`
    :host {
      display: block;
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .container {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 32px;
    }

    @media (max-width: 900px) {
      .container {
        grid-template-columns: 1fr;
        gap: 24px;
      }
    }

    h2, h3 {
      margin: 0 0 16px 0;
      color: var(--text-h, #08060d);
      font-weight: 600;
    }

    h2 {
      font-size: 24px;
    }

    h3 {
      font-size: 18px;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1px solid var(--border, #e5e4e7);
      padding-bottom: 8px;
    }

    .card-panel {
      background: var(--card-bg, #ffffff);
      border: 1px solid var(--border, #e5e4e7);
      border-radius: 12px;
      padding: 24px;
      box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.1));
    }

    .form-group {
      margin-bottom: 16px;
    }

    label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-h, #08060d);
      margin-bottom: 6px;
    }

    input, select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--border, #e5e4e7);
      border-radius: 8px;
      background: var(--bg, #fff);
      color: var(--text-h, #08060d);
      font-family: inherit;
      font-size: 14px;
      box-sizing: border-box;
      transition: all 0.2s;
    }

    input:focus, select:focus {
      outline: none;
      border-color: var(--accent, #aa3bff);
      box-shadow: 0 0 0 3px var(--accent-bg, rgba(170, 59, 255, 0.1));
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.2s;
      width: 100%;
    }

    .btn-primary {
      background: var(--accent, #aa3bff);
      color: #ffffff;
    }

    .btn-primary:hover {
      background: #9030db;
    }

    .btn-secondary {
      background: var(--code-bg, #f4f3ec);
      color: var(--text-h, #08060d);
      border-color: var(--border, #e5e4e7);
    }

    .btn-secondary:hover {
      background: var(--border, #e5e4e7);
    }

    .btn-danger {
      background: rgba(239, 68, 68, 0.1);
      color: rgb(239, 68, 68);
      border-color: rgba(239, 68, 68, 0.2);
      width: auto;
      padding: 6px 12px;
    }

    .btn-danger:hover {
      background: rgb(239, 68, 68);
      color: #ffffff;
    }

    .error-msg {
      color: rgb(239, 68, 68);
      font-size: 13px;
      margin-top: 8px;
    }

    .token-saved-msg {
      color: rgb(16, 185, 129);
      font-size: 13px;
      margin-top: 8px;
    }

    .help-text {
      font-size: 12px;
      color: var(--text-muted, #6b6375);
      margin-top: 4px;
      line-height: 140%;
    }

    .filters-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .tabs {
      display: flex;
      background: var(--code-bg, #f4f3ec);
      padding: 4px;
      border-radius: 8px;
      border: 1px solid var(--border, #e5e4e7);
    }

    .tab {
      padding: 6px 12px;
      font-size: 13px;
      font-weight: 500;
      border-radius: 6px;
      background: transparent;
      border: none;
      color: var(--text, #6b6375);
      cursor: pointer;
      transition: all 0.2s;
    }

    .tab.active {
      background: var(--card-bg, #ffffff);
      color: var(--text-h, #08060d);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .search-wrapper {
      position: relative;
      flex-grow: 1;
      max-width: 300px;
    }

    .search-wrapper input {
      padding-left: 36px;
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

    .sources-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 550px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .source-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      background: var(--card-bg, #ffffff);
      border: 1px solid var(--border, #e5e4e7);
      border-radius: 8px;
      transition: all 0.2s;
    }

    .source-item:hover {
      border-color: var(--accent-border, rgba(170, 59, 255, 0.5));
    }

    .source-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .source-name {
      font-weight: 600;
      color: var(--text-h, #08060d);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .source-repo {
      font-family: var(--mono, monospace);
      font-size: 12px;
      color: var(--text-muted, #6b6375);
    }

    .source-filter-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 6px;
      font-size: 12px;
    }

    .source-filter-label {
      color: var(--text-muted, #6b6375);
      font-weight: 550;
      white-space: nowrap;
    }

    .source-filter-input {
      border: 1px solid var(--border, #e5e4e7);
      border-radius: 4px;
      padding: 3px 6px;
      font-size: 11px;
      width: 140px;
      background: var(--bg, #fff);
      color: var(--text-h, #08060d);
      transition: all 0.2s;
      display: inline-block;
    }

    .source-filter-input:focus {
      outline: none;
      border-color: var(--accent, #aa3bff);
      box-shadow: 0 0 0 2px var(--accent-bg, rgba(170, 59, 255, 0.08));
    }

    .source-category-badge {
      font-size: 10px;
      font-weight: 600;
      background: var(--code-bg, #f4f3ec);
      color: var(--text, #6b6375);
      border: 1px solid var(--border, #e5e4e7);
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .source-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    /* Custom Switch Toggle */
    .switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
    }

    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--border, #e5e4e7);
      transition: .3s;
      border-radius: 24px;
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .3s;
      border-radius: 50%;
    }

    input:checked + .slider {
      background-color: var(--accent, #aa3bff);
    }

    input:focus + .slider {
      box-shadow: 0 0 1px var(--accent, #aa3bff);
    }

    input:checked + .slider:before {
      transform: translateX(20px);
    }

    .danger-zone {
      margin-top: 24px;
      border-top: 1px solid var(--border, #e5e4e7);
      padding-top: 20px;
    }

    @media (prefers-color-scheme: dark) {
      .card-panel {
        background: var(--card-bg, #1f2028);
        border-color: var(--border, #2e303a);
      }
      h2, h3 {
        color: var(--text-h, #f3f4f6);
      }
      h3 {
        border-bottom-color: var(--border, #2e303a);
      }
      input, select {
        background: var(--bg, #16171d);
        border-color: var(--border, #2e303a);
        color: var(--text-h, #f3f4f6);
      }
      .btn-secondary {
        background: var(--code-bg, #16171d);
        border-color: var(--border, #2e303a);
        color: var(--text-h, #f3f4f6);
      }
      .btn-secondary:hover {
        background: var(--border, #2e303a);
      }
      .tabs {
        background: var(--code-bg, #16171d);
        border-color: var(--border, #2e303a);
      }
      .tab.active {
        background: var(--card-bg, #1f2028);
        color: var(--text-h, #f3f4f6);
      }
      .source-item {
        background: var(--card-bg, #1f2028);
        border-color: var(--border, #2e303a);
      }
      .source-name {
        color: var(--text-h, #f3f4f6);
      }
      .source-category-badge {
        background: var(--code-bg, #16171d);
        border-color: var(--border, #2e303a);
        color: var(--text, #9ca3af);
      }
      .slider {
        background-color: var(--border, #2e303a);
      }
      .danger-zone {
        border-top-color: var(--border, #2e303a);
      }
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this._tokenInput = this.githubToken;
  }

  willUpdate(changedProperties: Map<string, any>) {
    if (changedProperties.has('githubToken')) {
      this._tokenInput = this.githubToken;
    }
  }

  render() {
    const filteredSources = this.sources.filter(source => {
      const matchesSearch = 
        source.name.toLowerCase().includes(this._searchQuery.toLowerCase()) ||
        `${source.owner}/${source.repo}`.toLowerCase().includes(this._searchQuery.toLowerCase());
      
      const matchesTab = 
        this._activeTab === 'all' ||
        (this._activeTab === 'enabled' && source.enabled) ||
        (this._activeTab === 'disabled' && !source.enabled);

      return matchesSearch && matchesTab;
    });

    return html`
      <h2>Manage News Sources</h2>
      <div class="container">
        <!-- Configuration Controls -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          <!-- Add Source Form -->
          <div class="card-panel">
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              Add GitHub Source
            </h3>
            
            <div class="form-group">
              <label for="source-name">Display Name</label>
              <input 
                id="source-name" 
                type="text" 
                placeholder="e.g. Node.js"
                .value="${this._newName}"
                @input="${(e: any) => this._newName = e.target.value}"
              />
            </div>

            <div class="form-group">
              <label for="source-owner">Repo Owner / Organization</label>
              <input 
                id="source-owner" 
                type="text" 
                placeholder="e.g. nodejs"
                .value="${this._newOwner}"
                @input="${(e: any) => this._newOwner = e.target.value}"
              />
            </div>

            <div class="form-group">
              <label for="source-repo">Repository Name</label>
              <input 
                id="source-repo" 
                type="text" 
                placeholder="e.g. node"
                .value="${this._newRepo}"
                @input="${(e: any) => this._newRepo = e.target.value}"
              />
            </div>

            <div class="form-group">
              <label for="source-category">Category</label>
              <select 
                id="source-category"
                .value="${this._newCategory}"
                @change="${(e: any) => this._newCategory = e.target.value}"
              >
                <option value="Framework">Framework</option>
                <option value="Runtime">Runtime</option>
                <option value="Tooling">Tooling</option>
                <option value="Language">Language</option>
                <option value="Library">Library</option>
              </select>
            </div>

            <div class="form-group">
              <label for="source-tag-filter">Release/Tag Filter (Regex)</label>
              <input 
                id="source-tag-filter" 
                type="text" 
                placeholder="e.g. ^v\d+ (optional)"
                .value="${this._newTagFilter}"
                @input="${(e: any) => this._newTagFilter = e.target.value}"
              />
              <p class="help-text">Regex to filter tags (e.g. <code>^v\d+</code> for main CLI releases, or <code>^v12\.</code> for v12).</p>
            </div>

            <div class="form-group">
              <label for="source-feed-url">Official Release Feed URL (RSS/Atom)</label>
              <input 
                id="source-feed-url" 
                type="url" 
                placeholder="e.g. https://example.com/feed.xml (optional)"
                .value="${this._newFeedUrl}"
                @input="${(e: any) => this._newFeedUrl = e.target.value}"
              />
              <p class="help-text">Direct URL to the project's official product changelog or blog RSS/Atom feed.</p>
            </div>

            <button class="btn btn-primary" @click="${this._handleAddSource}">
              Add Source
            </button>
            
            ${this._formError ? html`<p class="error-msg">${this._formError}</p>` : ''}
          </div>

          <!-- API Settings Form -->
          <div class="card-panel">
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              GitHub Authentication
            </h3>
            <p class="help-text" style="margin-bottom: 12px;">
              By default, GitHub limits anonymous API requests to 60/hr. Paste a GitHub Personal Access Token (PAT) to increase limits to 5,000/hr.
            </p>
            <div class="form-group">
              <label for="token-field">Personal Access Token (classic or fine-grained)</label>
              <input 
                id="token-field" 
                type="password" 
                placeholder="ghp_..."
                .value="${this._tokenInput}"
                @input="${(e: any) => this._tokenInput = e.target.value}"
              />
              <p class="help-text">No scopes are needed for public repositories.</p>
            </div>
            
            <button class="btn btn-secondary" @click="${this._handleSaveToken}">
              Save Token
            </button>
            ${this._tokenSaved ? html`<p class="token-saved-msg">✓ Token saved to local database</p>` : ''}
          </div>
        </div>

        <!-- Sources Directory -->
        <div class="card-panel">
          <div class="filters-bar">
            <h3>Sources Directory (${this.sources.length})</h3>
            <div class="tabs">
              <button 
                class="tab ${this._activeTab === 'all' ? 'active' : ''}" 
                @click="${() => this._activeTab = 'all'}"
              >All</button>
              <button 
                class="tab ${this._activeTab === 'enabled' ? 'active' : ''}" 
                @click="${() => this._activeTab = 'enabled'}"
              >Enabled</button>
              <button 
                class="tab ${this._activeTab === 'disabled' ? 'active' : ''}" 
                @click="${() => this._activeTab = 'disabled'}"
              >Disabled</button>
            </div>
          </div>

          <div class="search-wrapper" style="max-width: 100%; margin-bottom: 20px;">
            <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              placeholder="Search configured sources..."
              .value="${this._searchQuery}"
              @input="${(e: any) => this._searchQuery = e.target.value}"
            />
          </div>

          <div class="sources-list">
            ${filteredSources.length === 0 ? html`
              <p style="text-align: center; color: var(--text-muted); padding: 32px 0;">
                No sources match the active filter or search query.
              </p>
            ` : filteredSources.map(source => html`
              <div class="source-item">
                <div class="source-info">
                  <div class="source-name">
                    ${source.name}
                    <span class="source-category-badge">${source.category}</span>
                  </div>
                  <div class="source-repo">${source.owner}/${source.repo}</div>
                  ${source.feedUrl ? html`
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px; word-break: break-all;">
                      Feed: <a href="${source.feedUrl}" target="_blank" style="color: var(--accent); text-decoration: none;">${source.feedUrl}</a>
                    </div>
                  ` : ''}
                  
                  <div class="source-filter-row">
                    <span class="source-filter-label" title="Regex pattern to filter release tags (e.g. ^v\d+)">Filter (regex):</span>
                    <input 
                      type="text" 
                      class="source-filter-input"
                      placeholder="e.g. ^v\d+"
                      .value="${source.tagFilter || ''}"
                      @change="${(e: any) => this._updateSourceFilter(source, e.target.value)}"
                    />
                  </div>
                </div>
                <div class="source-actions">
                  <label class="switch" title="Toggle this feed source">
                    <input 
                      type="checkbox" 
                      ?checked="${source.enabled}"
                      @change="${(e: any) => this._toggleSource(source, e.target.checked)}"
                    />
                    <span class="slider"></span>
                  </label>
                  
                  ${this._isCustomSource(source.id) ? html`
                    <button 
                      class="btn btn-danger" 
                      @click="${() => this._deleteSource(source.id)}"
                      title="Delete this custom source"
                    >
                      Delete
                    </button>
                  ` : ''}
                </div>
              </div>
            `)}
          </div>

          <div class="danger-zone">
            <h3 style="color: rgb(239, 68, 68); font-size: 16px; border-bottom: none; margin-bottom: 8px;">Reset Sources</h3>
            <p class="help-text" style="margin-bottom: 12px;">
              Revert your list of sources back to the factory defaults. Custom sources will be removed.
            </p>
            <button class="btn btn-danger" @click="${this._handleResetSources}" style="width: auto;">
              Reset to Default Sources
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private _isCustomSource(id: string): boolean {
    // Default sources are defined by specific IDs in DB
    const defaults = ['node', 'npm', 'lit', 'angular', 'react', 'vue', 'vite', 'oxc', 'biome', 'nextjs', 'yarn', 'bun', 'deno', 'typescript', 'svelte', 'tailwind', 'github-changelog'];
    return !defaults.includes(id);
  }

  private _handleAddSource() {
    this._formError = '';

    if (!this._newName.trim() || !this._newOwner.trim() || !this._newRepo.trim()) {
      this._formError = 'Please fill out all fields.';
      return;
    }

    const id = `custom-${this._newOwner.toLowerCase()}-${this._newRepo.toLowerCase()}`;
    
    // Check if source already exists
    if (this.sources.some(s => s.id === id)) {
      this._formError = 'This repository is already in your sources list.';
      return;
    }

    const newSource: Source = {
      id,
      owner: this._newOwner.trim(),
      repo: this._newRepo.trim(),
      name: this._newName.trim(),
      enabled: true,
      category: this._newCategory,
      tagFilter: this._newTagFilter.trim() || undefined,
      feedUrl: this._newFeedUrl.trim() || undefined
    };

    // Dispatch event to parent to save
    this.dispatchEvent(new CustomEvent('add-source', {
      detail: { source: newSource },
      bubbles: true,
      composed: true
    }));

    // Reset inputs
    this._newName = '';
    this._newOwner = '';
    this._newRepo = '';
    this._newCategory = 'Framework';
    this._newTagFilter = '';
    this._newFeedUrl = '';
  }

  private _toggleSource(source: Source, enabled: boolean) {
    const updatedSource = { ...source, enabled };
    this.dispatchEvent(new CustomEvent('update-source', {
      detail: { source: updatedSource },
      bubbles: true,
      composed: true
    }));
  }

  private _updateSourceFilter(source: Source, value: string) {
    const updatedSource = { 
      ...source, 
      tagFilter: value.trim() || undefined 
    };
    this.dispatchEvent(new CustomEvent('update-source', {
      detail: { source: updatedSource },
      bubbles: true,
      composed: true
    }));
  }

  private _deleteSource(id: string) {
    if (confirm('Are you sure you want to delete this news source?')) {
      this.dispatchEvent(new CustomEvent('delete-source', {
        detail: { id },
        bubbles: true,
        composed: true
      }));
    }
  }

  private _handleSaveToken() {
    const token = this._tokenInput.trim();
    this.dispatchEvent(new CustomEvent('save-token', {
      detail: { token },
      bubbles: true,
      composed: true
    }));

    this._tokenSaved = true;
    setTimeout(() => {
      this._tokenSaved = false;
    }, 3000);
  }

  private _handleResetSources() {
    if (confirm('This will restore default sources and delete all custom sources. Continue?')) {
      this.dispatchEvent(new CustomEvent('reset-sources', {
        bubbles: true,
        composed: true
      }));
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sources-manager': SourcesManager;
  }
}
