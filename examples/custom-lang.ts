/**
 * Example: Custom language tag and mdast node output
 *
 * This demo shows how to:
 * 1. Use a custom lang identifier (```widget instead of ```component)
 * 2. Return a custom mdast node object from the renderer instead of a string
 *
 * Run: npx tsx examples/custom-lang.ts
 */

import { remark } from "remark";
import remarkHtml from "remark-html";
import fencer from "../src/index.js";

const markdown = `
# Widget Gallery

Here are some custom widgets embedded in Markdown:

\`\`\`widget
title: Temperature
type: gauge
value: 72
unit: °F
\`\`\`

Normal paragraph between widgets.

\`\`\`widget
title: Server Status
type: statusBadge
value: online
color: green
\`\`\`

Regular code blocks are left untouched:

\`\`\`javascript
console.log("I'm not a widget!");
\`\`\`
`;

async function main() {
  // Using a custom lang tag and returning mdast node objects
  const result = await remark()
    .use(fencer, {
      lang: "widget",
      renderer: (data) => {
        // Return a custom mdast node instead of a plain string
        return {
          type: "html",
          value: `<div class="widget widget--${data.type}" data-props='${JSON.stringify(data)}'>
  <span class="widget__label">${data.title}</span>
  <span class="widget__value" style="color: ${data.color ?? "inherit"}">${data.value}${data.unit ?? ""}</span>
</div>`,
        };
      },
    })
    .use(remarkHtml, { sanitize: false })
    .process(markdown);

  console.log("=== Custom Lang + Node Output Demo ===\n");
  console.log(String(result));
}

main().catch(console.error);
