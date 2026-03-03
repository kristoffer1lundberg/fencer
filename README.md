# Fencer

A [remark](https://github.com/remarkjs/remark) plugin that transforms fenced `component` code blocks (written in YAML) into custom rendered output. Works in Node.js and the browser.

## Overview

This plugin lets you embed structured component data inside Markdown using YAML syntax, then render it however you like — as HTML strings, React elements, or any other format your framework supports.

````markdown
# My Article

Here is a fact box:

```component
title: Did you know?
type: factBox
text: Honey never spoils. Archaeologists have found 3000-year-old honey that was still edible.
```

And here is the rest of the article.
````

The plugin will:

1. **Parse** the YAML inside `` ```component `` blocks into a JSON object
2. **Validate** the object against an optional [Zod](https://zod.dev/) schema
3. **Render** the object using your custom renderer function
4. **Replace** the code block in the AST with the rendered output

## Installation

```bash
npm install @kristofferlundb/fencer
```

### Peer dependencies

- **zod** (optional) — only needed if you want schema validation

```bash
npm install zod
```

## Quick Start

```js
import { remark } from "remark";
import remarkHtml from "remark-html";
import fencer from "@kristofferlundb/fencer";

const markdown = `
# Hello

\`\`\`component
title: A fun fact
type: factBox
text: The shortest war in history lasted 38 minutes.
\`\`\`

Regular paragraph here.
`;

const result = await remark()
  .use(fencer, {
    renderer: (data) => {
      return `<div class="${data.type}"><h3>${data.title}</h3><p>${data.text}</p></div>`;
    },
  })
  .use(remarkHtml, { sanitize: false })
  .process(markdown);

console.log(String(result));
```

**Output:**

```html
<h1>Hello</h1>
<div class="factBox"><h3>A fun fact</h3><p>The shortest war in history lasted 38 minutes.</p></div>
<p>Regular paragraph here.</p>
```

## Rendering by Component Type

The real power of Fencer is using `data.type` (or any field you choose) to render **different components differently**. Here are practical patterns for handling multiple component types.

### Basic `switch` on type

The simplest approach — use a `switch` statement in your renderer to produce different HTML for each type:

````markdown
```component
title: Did you know?
type: factBox
text: Honey never spoils.
```

```component
type: callout
variant: warning
title: Heads up
text: This API is deprecated and will be removed in v3.
```

```component
type: quote
text: The best way to predict the future is to invent it.
author: Alan Kay
year: 1971
```
````

```js
import { remark } from "remark";
import remarkHtml from "remark-html";
import fencer from "@kristofferlundb/fencer";

const result = await remark()
  .use(fencer, {
    renderer: (data) => {
      switch (data.type) {
        case "factBox":
          return `<div class="fact-box">
            <h3>💡 ${data.title}</h3>
            <p>${data.text}</p>
          </div>`;

        case "callout":
          return `<aside class="callout callout--${data.variant}">
            ${data.title ? `<strong>${data.title}</strong>` : ""}
            <p>${data.text}</p>
          </aside>`;

        case "quote":
          return `<blockquote class="quote">
            <p>"${data.text}"</p>
            <footer>— ${data.author}${data.year ? ` (${data.year})` : ""}</footer>
          </blockquote>`;

        default:
          return `<div class="unknown-component"><pre>${JSON.stringify(data, null, 2)}</pre></div>`;
      }
    },
  })
  .use(remarkHtml, { sanitize: false })
  .process(markdown);
```

### Type-safe rendering with a Zod discriminated union

For production use, define per-type schemas and combine them into a [discriminated union](https://zod.dev/?id=discriminated-unions). This gives you full type safety inside each `case` branch:

```ts
import { z } from "zod";
import { remark } from "remark";
import remarkHtml from "remark-html";
import fencer from "@kristofferlundb/fencer";

// Define a schema for each component type
const FactBoxSchema = z.object({
  type: z.literal("factBox"),
  title: z.string(),
  text: z.string(),
  source: z.string().optional(),
});

const CalloutSchema = z.object({
  type: z.literal("callout"),
  variant: z.enum(["info", "warning", "error", "success"]),
  title: z.string().optional(),
  text: z.string(),
});

const QuoteSchema = z.object({
  type: z.literal("quote"),
  text: z.string(),
  author: z.string(),
  year: z.number().optional(),
});

// Combine into a discriminated union on the "type" field
const ComponentSchema = z.discriminatedUnion("type", [
  FactBoxSchema,
  CalloutSchema,
  QuoteSchema,
]);

type ComponentData = z.infer<typeof ComponentSchema>;

// The renderer now has full type narrowing inside each case
function renderComponent(data: ComponentData): string {
  switch (data.type) {
    case "factBox":
      // TS knows: data.title, data.text, data.source?
      return `<div class="fact-box">
        <h3>📘 ${data.title}</h3>
        <p>${data.text}</p>
        ${data.source ? `<small>Source: ${data.source}</small>` : ""}
      </div>`;

    case "callout":
      // TS knows: data.variant, data.title?, data.text
      const icons = { info: "ℹ️", warning: "⚠️", error: "🚨", success: "✅" };
      return `<aside class="callout callout--${data.variant}">
        ${data.title ? `<strong>${icons[data.variant]} ${data.title}</strong>` : ""}
        <p>${data.text}</p>
      </aside>`;

    case "quote":
      // TS knows: data.text, data.author, data.year?
      return `<blockquote class="quote">
        <p>"${data.text}"</p>
        <footer>— ${data.author}${data.year ? ` (${data.year})` : ""}</footer>
      </blockquote>`;
  }
}

const result = await remark()
  .use(fencer, {
    schema: ComponentSchema,
    renderer: renderComponent,
  })
  .use(remarkHtml, { sanitize: false })
  .process(markdown);
```

With this setup, if someone writes an invalid component block in Markdown (e.g. a `callout` with `variant: "purple"`), Zod will catch it **at processing time** before it reaches your renderer.

### Renderer lookup map

If you prefer to avoid a `switch`, you can use an object map to look up renderers by type:

```js
const renderers = {
  factBox: (data) =>
    `<div class="fact-box"><h3>${data.title}</h3><p>${data.text}</p></div>`,

  callout: (data) =>
    `<aside class="callout callout--${data.variant}"><p>${data.text}</p></aside>`,

  quote: (data) =>
    `<blockquote><p>"${data.text}"</p><footer>— ${data.author}</footer></blockquote>`,
};

remark().use(fencer, {
  renderer: (data) => {
    const render = renderers[data.type];
    if (!render) {
      return `<div class="error">Unknown component type: ${data.type}</div>`;
    }
    return render(data);
  },
});
```

### Nested data and arrays

Component types aren't limited to flat key-value pairs. Use nested objects and arrays for richer structures:

````markdown
```component
type: card
title: Project Update
meta:
  author: Jane Doe
  date: 2025-01-15
  tags:
    - release
    - frontend
items:
  - Redesigned the dashboard
  - Fixed 12 accessibility issues
  - Improved load time by 40%
```
````

```js
remark().use(fencer, {
  renderer: (data) => {
    switch (data.type) {
      case "card":
        const tags = (data.meta?.tags || [])
          .map((t) => `<span class="tag">${t}</span>`)
          .join(" ");
        const items = (data.items || [])
          .map((item) => `<li>${item}</li>`)
          .join("\n");
        return `<article class="card">
          <h3>${data.title}</h3>
          <div class="meta">By ${data.meta?.author} on ${data.meta?.date} ${tags}</div>
          <ul>${items}</ul>
        </article>`;

      default:
        return `<div>${JSON.stringify(data)}</div>`;
    }
  },
});
```

## API

### `fencer(options)`

#### `options.renderer` (required)

A function that receives the parsed component data and returns either:

- A **string** of HTML — injected as an `html` node in the AST
- A **node object** with a `type` property — inserted directly into the mdast tree

```js
// String renderer
renderer: (data) => `<div class="${data.type}">${data.title}</div>`,

// Node renderer
renderer: (data) => ({
  type: "html",
  value: `<my-component title="${data.title}" />`,
})
```

#### `options.schema` (optional)

A [Zod](https://zod.dev/) schema to validate parsed YAML against. When provided, the `data` argument in your renderer will be fully typed. This works with simple schemas and discriminated unions alike (see [Rendering by Component Type](#rendering-by-component-type) for a full union example).

```ts
import { z } from "zod";

const ComponentSchema = z.object({
  title: z.string(),
  type: z.enum(["factBox", "callout", "quote"]),
  text: z.string(),
});

remark().use(fencer, {
  schema: ComponentSchema,
  renderer: (data) => {
    // data is typed as { title: string; type: "factBox" | "callout" | "quote"; text: string }
    return `<div class="${data.type}"><h3>${data.title}</h3><p>${data.text}</p></div>`;
  },
});
```

#### `options.onValidationError` (optional)

Controls what happens when Zod validation fails. Default: `"throw"`.

| Value           | Behavior                                                          |
| --------------- | ----------------------------------------------------------------- |
| `"throw"`       | Throws an error with details about which fields failed            |
| `"warn"`        | Logs a warning to the console and passes the raw data to renderer |
| `"passthrough"` | Silently ignores the error and passes the raw data to renderer    |

```js
remark().use(fencer, {
  schema: MySchema,
  onValidationError: "warn",
  renderer: (data) => `<div>${data.title}</div>`,
});
```

#### `options.lang` (optional)

The fenced code block language identifier to match. Default: `"component"`.

```js
// Match ```widget blocks instead of ```component
remark().use(fencer, {
  lang: "widget",
  renderer: (data) => `<widget-element>${data.title}</widget-element>`,
});
```

## Framework Integration

### Vanilla HTML

```js
import { remark } from "remark";
import remarkHtml from "remark-html";
import fencer from "@kristofferlundb/fencer";

const html = await remark()
  .use(fencer, {
    renderer: (data) =>
      `<div class="component component--${data.type}">
        <h3>${data.title}</h3>
        <p>${data.text}</p>
      </div>`,
  })
  .use(remarkHtml, { sanitize: false })
  .process(markdown);
```

### React / Next.js (via MDX or custom processing)

Since the renderer returns HTML strings that get embedded in the AST, you can use this with any React-based Markdown pipeline. A common pattern is to output custom element tags that map to React components:

```js
remark().use(fencer, {
  renderer: (data) => {
    // Emit a custom element that your React component library can pick up
    const props = Object.entries(data)
      .map(([k, v]) => `${k}="${v}"`)
      .join(" ");
    return `<CustomComponent ${props} />`;
  },
});
```

Or for `rehype`-based pipelines, return a custom mdast node:

```js
remark().use(fencer, {
  renderer: (data) => ({
    type: "html",
    value: `<custom-component data-props='${JSON.stringify(data)}'></custom-component>`,
  }),
});
```

### Astro

```js
// astro.config.mjs
import fencer from "@kristofferlundb/fencer";

export default defineConfig({
  markdown: {
    remarkPlugins: [
      [
        fencer,
        {
          renderer: (data) =>
            `<div class="${data.type}"><h3>${data.title}</h3><p>${data.text}</p></div>`,
        },
      ],
    ],
  },
});
```

## YAML Syntax

The content inside `` ```component `` blocks is parsed as standard YAML. You can use all YAML features:

````markdown
```component
title: My Component
type: factBox
text: Simple string value
```
````

**Nested objects:**

````markdown
```component
title: Advanced
type: card
meta:
  author: Jane Doe
  date: 2025-01-15
```
````

**Arrays:**

````markdown
```component
title: Feature List
type: list
items:
  - First item
  - Second item
  - Third item
```
````

**Multiline strings:**

````markdown
```component
title: Long Text
type: article
text: >
  This is a long piece of text
  that spans multiple lines but
  will be joined into one.
```
````

## Exported Utilities

In addition to the main plugin, the package exports the internal utilities for standalone use:

```ts
import { parseYaml, validateData } from "@kristofferlundb/fencer";

// Parse YAML string to object
const data = parseYaml("title: Hello\ntype: box");
// => { title: "Hello", type: "box" }

// Validate data against a Zod schema
import { z } from "zod";
const schema = z.object({ title: z.string(), type: z.string() });
const validated = validateData(data, schema);
```

## TypeScript

Full TypeScript support is included out of the box. The package ships with declaration files for both ESM and CJS.

```ts
import fencer from "@kristofferlundb/fencer";
import type {
  PluginOptions,
  Renderer,
  RendererResult,
  ComponentNode,
  ValidationErrorMode,
} from "@kristofferlundb/fencer";
```

When you provide a Zod schema, the renderer's `data` parameter is automatically inferred:

```ts
import { z } from "zod";

const schema = z.object({
  title: z.string(),
  type: z.enum(["factBox", "callout"]),
  text: z.string(),
});

remark().use(fencer, {
  schema,
  renderer: (data) => {
    // TypeScript knows: data.title is string, data.type is "factBox" | "callout", etc.
    return `<div>${data.title}</div>`;
  },
});
```

## License

MIT
