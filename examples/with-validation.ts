/**
 * Example: Using markdown-components with Zod validation
 *
 * Run with: npx tsx examples/with-validation.ts
 */
import { remark } from "remark";
import remarkHtml from "remark-html";
import { z } from "zod";
import remarkComponents from "../src/index.js";

// ── Define schemas for different component types ────────────────────────────

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

// ── Renderer ────────────────────────────────────────────────────────────────

function renderComponent(data: ComponentData): string {
  switch (data.type) {
    case "factBox":
      return `
<div style="border-left: 4px solid #3b82f6; background: #eff6ff; padding: 16px; margin: 16px 0; border-radius: 4px;">
  <h3 style="margin: 0 0 8px 0; color: #1d4ed8;">📘 ${data.title}</h3>
  <p style="margin: 0; color: #1e40af;">${data.text}</p>
  ${data.source ? `<small style="color: #6b7280;">Source: ${data.source}</small>` : ""}
</div>`.trim();

    case "callout": {
      const styles: Record<string, { icon: string; border: string; bg: string; color: string }> = {
        info:    { icon: "ℹ️", border: "#3b82f6", bg: "#eff6ff", color: "#1e40af" },
        warning: { icon: "⚠️", border: "#f59e0b", bg: "#fffbeb", color: "#92400e" },
        error:   { icon: "🚨", border: "#ef4444", bg: "#fef2f2", color: "#991b1b" },
        success: { icon: "✅", border: "#10b981", bg: "#ecfdf5", color: "#065f46" },
      };
      const s = styles[data.variant];
      return `
<div style="border-left: 4px solid ${s.border}; background: ${s.bg}; padding: 16px; margin: 16px 0; border-radius: 4px;">
  ${data.title ? `<h4 style="margin: 0 0 8px 0; color: ${s.color};">${s.icon} ${data.title}</h4>` : ""}
  <p style="margin: 0; color: ${s.color};">${!data.title ? s.icon + " " : ""}${data.text}</p>
</div>`.trim();
    }

    case "quote":
      return `
<blockquote style="border-left: 4px solid #a78bfa; background: #f5f3ff; padding: 16px; margin: 16px 0; border-radius: 4px; font-style: italic;">
  <p style="margin: 0 0 8px 0; color: #4c1d95;">"${data.text}"</p>
  <footer style="color: #6d28d9;">— ${data.author}${data.year ? ` (${data.year})` : ""}</footer>
</blockquote>`.trim();
  }
}

// ── Markdown input ──────────────────────────────────────────────────────────

const markdown = `
# The Wonders of Nature

Nature is full of surprises. Here are some highlights.

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
text: Always bring plenty of water when hiking in desert environments. Dehydration can set in faster than you think.
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

// ── Process and output ──────────────────────────────────────────────────────

async function main() {
  console.log("=== With Zod Validation Demo ===\n");

  const result = await remark()
    .use(remarkComponents, {
      schema: ComponentSchema,
      renderer: renderComponent,
    })
    .use(remarkHtml, { sanitize: false })
    .process(markdown);

  console.log(String(result));

  // ── Demonstrate validation error ────────────────────────────────────────

  console.log("\n=== Validation Error Demo (warn mode) ===\n");

  const badMarkdown = `
\`\`\`component
type: callout
variant: invalid-variant
text: This has an invalid variant
\`\`\`
`;

  const result2 = await remark()
    .use(remarkComponents, {
      schema: ComponentSchema,
      onValidationError: "warn",
      renderer: (data) =>
        `<div style="border: 2px dashed red; padding: 12px;">[Fallback] ${JSON.stringify(data)}</div>`,
    })
    .use(remarkHtml, { sanitize: false })
    .process(badMarkdown);

  console.log(String(result2));
}

main().catch(console.error);
