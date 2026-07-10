# Lit Component & Project Guidelines

This project is built using **Lit 3**, **TypeScript**, and **Vite**. To maintain consistency, prevent code hallucinations, and write safe, standard Lit elements, please adhere to the following conventions and patterns.

---

## 1. Project Stack & Environment

- **Core Library:** Lit 3 (`lit`)
- **Build Tool:** Vite
- **Language:** TypeScript
- **TypeScript Settings (Mandatory):**
  - `"experimentalDecorators": true` (We recommend experimental decorators for optimal compiler output in Lit).
  - `"useDefineForClassFields": false` (Critically required when using standard experimental decorators in Lit to prevent properties from being overwritten by standard class field definitions).
  - `"target": "es2023"`

---

## 2. Lit Component Architecture & Lifecycle

Every component must follow this structure:

### Basic Component Template

```typescript
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('my-custom-element')
export class MyCustomElement extends LitElement {
  // 1. Reactive Properties (Public API)
  @property({ type: String })
  name = 'World';

  // 2. Internal Reactive State (Private API)
  @state()
  private _isActive = false;

  // 3. Static Styles (Scoped)
  static styles = css`
    :host {
      display: block;
      color: var(--text-color, #333);
    }
  `;

  // 4. Render Method
  render() {
    return html`
      <p>Hello, ${this.name}!</p>
      <button @click=${this._toggleActive}>
        State: ${this._isActive ? 'Active' : 'Inactive'}
      </button>
    `;
  }

  // 5. Event Handlers & Methods
  private _toggleActive() {
    this._isActive = !this._isActive;
    
    // Dispatch a custom event (composed and bubbles for standard shadow DOM crossing)
    this.dispatchEvent(new CustomEvent('active-changed', {
      detail: { active: this._isActive },
      bubbles: true,
      composed: true,
    }));
  }
}

// 6. Typings for global HTML elements (VITAL for TypeScript/JSX integration)
declare global {
  interface HTMLElementTagNameMap {
    'my-custom-element': MyCustomElement;
  }
}
```

---

## 3. Reactive Properties vs. State

- Use `@property({ type: Type })` for properties that are part of the **public API** of the component (can be set as attributes/properties by consumers).
- Use `@state()` for internal **private/protected state** that triggers re-renders but should not be exposed as public attributes.
- Supported property option types: `String`, `Number`, `Boolean`, `Array`, `Object`.
- For Boolean properties, ensure they default to `false` (standard HTML attribute behavior is that the presence of the attribute indicates `true`).

---

## 4. DOM Querying inside Shadow Root

Avoid using manual document queries or `this.shadowRoot.querySelector` where possible. Instead, use Lit's built-in query decorators:

- **Single element query:** `@query('.selector')`
- **Multiple elements query:** `@queryAll('.selector')`
- **Query async/cached element:** `@queryAsync('.selector')`

Example:
```typescript
@query('#main-button')
button!: HTMLButtonElement;
```

---

## 5. Styling Best Practices

- **Shadow DOM Scoped:** All styles declared in `static styles` are scoped to the component's shadow root.
- **The Host Element:** Always use `:host` to style the custom element itself. Use `:host([disabled])` to style the element when a specific attribute is present.
- **Theming:** Use CSS custom properties (`var(--some-var, default)`) to allow outer page styles to theme your custom element.
- **Children Styling:** Use `::slotted(selector)` to style elements passed into a `<slot>`. Note that `::slotted()` only selects direct children of the slot.

---

## 6. Event Handling

- Register event listeners in templates declaratively using `@event-name=${this._handler}`.
- For custom events, always set `bubbles: true` and `composed: true` if you want the event to bubble up through the Shadow DOM boundaries to the main document.

---

## 7. Import & Export Conventions

- **File Extensions:** To preserve compatibility with standard ES modules, bundlers, and import maps, always author import paths with explicit file extensions for local files:
  ```typescript
  import { MyElement } from './my-element.js'; // Correct
  ```
- **Self-Defining:** Every custom element file should self-define its custom element name (using the `@customElement` decorator) to guarantee registration on import.
- **Explicit Exports:** Always export the element class to allow subclassing, type referencing, or scoped custom element registration.

---

## 8. Development & Testing Workflow

- **Vite Dev Server:** Run `npm run dev` for local HMR testing.
- **TypeScript Compilation:** Run `npm run build` to verify types and build the production bundles.
- **Do Not import polyfills directly** in component modules; polyfills are an application-level concern.
