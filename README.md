# markdown-components

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
npm install markdown-components
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
import remarkComponents from "markdown-components";

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
  .use(remarkComponents, {
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

## API

### `remarkComponents(options)`

#### `options.renderer` (required)

A function that receives the parsed component data and returns either:

- A **string** of HTML — injected as an `html` node in the AST
- A **node object** with a `type` property — inserted directly into the mdast tree

```js
// String renderer
renderer: (data) => `<div class="${data.type}">${data.title}</div>`

// Node renderer
renderer: (data) => ({
  type: "html",
  value: `<my-component title="${data.title}" />`,
})
```

#### `options.schema` (optional)

A [Zod](https://zod.dev/) schema to validate parsed YAML against. When provided, the `data` argument in your renderer will be fully typed.

```ts
import { z } from "zod";

const ComponentSchema = z.object({
  title: z.string(),
  type: z.enum(["factBox", "callout", "quote"]),
  text: z.string(),
});

remark().use(remarkComponents, {
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
remark().use(remarkComponents, {
  schema: MySchema,
  onValidationError: "warn",
  renderer: (data) => `<div>${data.title}</div>`,
});
```

#### `options.lang` (optional)

The fenced code block language identifier to match. Default: `"component"`.

```js
// Match ```widget blocks instead of ```component
remark().use(remarkComponents, {
  lang: "widget",
  renderer: (data) => `<widget-element>${data.title}</widget-element>`,
});
```

## Framework Integration

### Vanilla HTML

```js
import { remark } from "remark";
import remarkHtml from "remark-html";
import remarkComponents from "markdown-components";

const html = await remark()
  .use(remarkComponents, {
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
remark().use(remarkComponents, {
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
remark().use(remarkComponents, {
  renderer: (data) => ({
    type: "html",
    value: `<custom-component data-props='${JSON.stringify(data)}'></custom-component>`,
  }),
});
```

### Astro

```js
// astro.config.mjs
import remarkComponents from "markdown-components";

export default defineConfig({
  markdown: {
    remarkPlugins: [
      [
        remarkComponents,
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
import { parseYaml, validateData } from "markdown-components";

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
import remarkComponents from "markdown-components";
import type {
  PluginOptions,
  Renderer,
  RendererResult,
  ComponentNode,
  ValidationErrorMode,
} from "markdown-components";
```

When you provide a Zod schema, the renderer's `data` parameter is automatically inferred:

```ts
import { z } from "zod";

const schema = z.object({
  title: z.string(),
  type: z.enum(["factBox", "callout"]),
  text: z.string(),
});

remark().use(remarkComponents, {
  schema,
  renderer: (data) => {
    // TypeScript knows: data.title is string, data.type is "factBox" | "callout", etc.
    return `<div>${data.title}</div>`;
  },
});
```

## License

MIT