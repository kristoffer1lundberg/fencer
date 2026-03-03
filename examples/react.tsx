/**
 * Example: Rendering React components from Markdown component blocks
 *
 * This shows how to use @kristofferlundb/fencer with react-markdown to render
 * real React components from ```component blocks.
 *
 * The approach:
 * 1. The remark plugin parses YAML and outputs custom HTML elements
 *    (e.g. <md-component data-props='{"type":"factBox",...}'>) into the AST
 * 2. react-markdown renders the Markdown, and we map the custom element
 *    to a React component via the `components` prop
 * 3. The React component parses the JSON from data-props and renders accordingly
 *
 * Install peer dependencies:
 *   npm install react react-dom react-markdown
 *
 * Usage in a real app — drop the <MarkdownWithComponents> component
 * into any React page and pass it a Markdown string.
 */

import React from "react";
import ReactMarkdown from "react-markdown";
import fencer from "../src/index.js";
import { z } from "zod";

// ─── Zod schemas ────────────────────────────────────────────────────────────

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

const ComponentSchema = z.discriminatedUnion("type", [
  FactBoxSchema,
  CalloutSchema,
  QuoteSchema,
]);

type ComponentData = z.infer<typeof ComponentSchema>;

// ─── React components ───────────────────────────────────────────────────────

function FactBox({
  title,
  text,
  source,
}: {
  title: string;
  text: string;
  source?: string;
}) {
  return (
    <div
      style={{
        borderLeft: "4px solid #3b82f6",
        background: "#eff6ff",
        padding: 16,
        margin: "16px 0",
        borderRadius: 4,
      }}
    >
      <h3 style={{ margin: "0 0 8px 0", color: "#1d4ed8" }}>📘 {title}</h3>
      <p style={{ margin: 0, color: "#1e40af" }}>{text}</p>
      {source && <small style={{ color: "#6b7280" }}>Source: {source}</small>}
    </div>
  );
}

const calloutStyles = {
  info: { icon: "ℹ️", border: "#3b82f6", bg: "#eff6ff", color: "#1e40af" },
  warning: { icon: "⚠️", border: "#f59e0b", bg: "#fffbeb", color: "#92400e" },
  error: { icon: "🚨", border: "#ef4444", bg: "#fef2f2", color: "#991b1b" },
  success: { icon: "✅", border: "#10b981", bg: "#ecfdf5", color: "#065f46" },
};

function Callout({
  variant,
  title,
  text,
}: {
  variant: "info" | "warning" | "error" | "success";
  title?: string;
  text: string;
}) {
  const s = calloutStyles[variant];
  return (
    <div
      style={{
        borderLeft: `4px solid ${s.border}`,
        background: s.bg,
        padding: 16,
        margin: "16px 0",
        borderRadius: 4,
      }}
    >
      {title && (
        <h4 style={{ margin: "0 0 8px 0", color: s.color }}>
          {s.icon} {title}
        </h4>
      )}
      <p style={{ margin: 0, color: s.color }}>
        {!title && `${s.icon} `}
        {text}
      </p>
    </div>
  );
}

function Quote({
  text,
  author,
  year,
}: {
  text: string;
  author: string;
  year?: number;
}) {
  return (
    <blockquote
      style={{
        borderLeft: "4px solid #a78bfa",
        background: "#f5f3ff",
        padding: 16,
        margin: "16px 0",
        borderRadius: 4,
        fontStyle: "italic",
      }}
    >
      <p style={{ margin: "0 0 8px 0", color: "#4c1d95" }}>"{text}"</p>
      <footer style={{ color: "#6d28d9" }}>
        — {author}
        {year ? ` (${year})` : ""}
      </footer>
    </blockquote>
  );
}

// ─── Component resolver ─────────────────────────────────────────────────────

/**
 * Maps parsed component data to the appropriate React component.
 * This is where you'd add new component types.
 */
function ComponentRenderer({ data }: { data: ComponentData }) {
  switch (data.type) {
    case "factBox":
      return (
        <FactBox title={data.title} text={data.text} source={data.source} />
      );
    case "callout":
      return (
        <Callout variant={data.variant} title={data.title} text={data.text} />
      );
    case "quote":
      return <Quote text={data.text} author={data.author} year={data.year} />;
    default:
      return <pre>{JSON.stringify(data, null, 2)}</pre>;
  }
}

// ─── The bridge: custom element → React component ───────────────────────────

/**
 * react-markdown component override for the custom <md-component> element.
 *
 * When react-markdown encounters <md-component data-props='...'>, it calls
 * this function. We parse the JSON from data-props and render the appropriate
 * React component.
 */
function MdComponent(
  props: React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  >,
) {
  const raw = (props as Record<string, unknown>)["data-props"];
  if (typeof raw !== "string") {
    return <pre>Error: missing data-props on md-component</pre>;
  }

  try {
    const data = JSON.parse(raw) as ComponentData;
    return <ComponentRenderer data={data} />;
  } catch {
    return <pre>Error: invalid JSON in md-component data-props</pre>;
  }
}

// ─── Main component ─────────────────────────────────────────────────────────

/**
 * Drop-in React component that renders Markdown with embedded components.
 *
 * Usage:
 *   <MarkdownWithComponents content={markdownString} />
 */
export function MarkdownWithComponents({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[
        [
          fencer,
          {
            schema: ComponentSchema,
            renderer: (data: ComponentData) => {
              // Emit a custom HTML element with the data serialized as JSON.
              // react-markdown will pick this up via the `components` mapping below.
              return `<md-component data-props='${JSON.stringify(data)}'></md-component>`;
            },
          },
        ],
      ]}
      // Map the custom element to our React bridge component.
      // The key must match the element name emitted by the renderer.
      // Cast needed because react-markdown's Components type only allows standard HTML elements.
      components={
        {
          "md-component": MdComponent,
        } as Record<string, React.ComponentType<any>>
      }
    >
      {content}
    </ReactMarkdown>
  );
}

// ─── Demo usage ─────────────────────────────────────────────────────────────

const exampleMarkdown = `
# The Wonders of Nature

Nature is full of surprises.

\`\`\`component
type: factBox
title: Did you know?
text: Honey never spoils. Archaeologists have found 3000-year-old honey in Egyptian tombs that was still perfectly edible.
source: National Geographic
\`\`\`

## Be Careful Out There

\`\`\`component
type: callout
variant: warning
title: Safety First
text: Always bring plenty of water when hiking in desert environments.
\`\`\`

## Words of Wisdom

\`\`\`component
type: quote
text: In every walk with nature, one receives far more than he seeks.
author: John Muir
year: 1938
\`\`\`

\`\`\`component
type: callout
variant: success
text: You've reached the end of the article. Thanks for reading!
\`\`\`

---

*That's all for today.*
`;

/**
 * Example page component — in a real app this would be your page/layout.
 *
 *   import { App } from './examples/react'
 *   ReactDOM.createRoot(root).render(<App />)
 */
export function App() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <MarkdownWithComponents content={exampleMarkdown} />
    </div>
  );
}

export default App;
