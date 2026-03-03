import { remark } from "remark";
import remarkHtml from "remark-html";
import fencer from "../src/index.js";

const markdown = `
# Welcome to the Demo

This is a regular paragraph with **bold** and *italic* text.

\`\`\`component
title: Did you know?
type: factBox
text: Honey never spoils. Archaeologists have found 3000-year-old honey that was still edible.
\`\`\`

Here is another paragraph between components.

\`\`\`component
title: Important Notice
type: callout
text: Always validate your component data with a Zod schema in production.
\`\`\`

## Regular code blocks still work

\`\`\`javascript
console.log("This is not a component — it stays as a code block.");
\`\`\`

And a final paragraph to wrap things up.
`;

async function main() {
  const result = await remark()
    .use(fencer, {
      renderer: (data) => {
        const type = data.type as string;
        const title = data.title as string;
        const text = data.text as string;

        switch (type) {
          case "factBox":
            return [
              `<div style="border-left: 4px solid #3b82f6; background: #eff6ff; padding: 16px; margin: 16px 0; border-radius: 4px;">`,
              `  <strong style="color: #1d4ed8;">💡 ${title}</strong>`,
              `  <p style="margin: 8px 0 0 0; color: #1e40af;">${text}</p>`,
              `</div>`,
            ].join("\n");

          case "callout":
            return [
              `<div style="border-left: 4px solid #f59e0b; background: #fffbeb; padding: 16px; margin: 16px 0; border-radius: 4px;">`,
              `  <strong style="color: #b45309;">⚠️ ${title}</strong>`,
              `  <p style="margin: 8px 0 0 0; color: #92400e;">${text}</p>`,
              `</div>`,
            ].join("\n");

          default:
            return `<div><h3>${title}</h3><p>${text}</p></div>`;
        }
      },
    })
    .use(remarkHtml, { sanitize: false })
    .process(markdown);

  console.log("=== Input Markdown ===\n");
  console.log(markdown.trim());
  console.log("\n=== Output HTML ===\n");
  console.log(String(result));
}

main().catch(console.error);
