import type { Root, Code } from "mdast";
import type { Transformer } from "unified";
import { visit } from "unist-util-visit";
import { parseYaml } from "./parser.js";
import { validateData } from "./validator.js";
import type { PluginOptions, RendererResult, ComponentNode } from "./types.js";

/**
 * A remark plugin that transforms fenced code blocks marked with a specific
 * language tag (default: `component`) into custom rendered output.
 *
 * The content inside the fenced block is parsed as YAML, optionally validated
 * against a Zod schema, and then passed to a user-supplied renderer function.
 */
export function remarkComponents(options: PluginOptions): Transformer<Root> {
  const {
    renderer,
    schema,
    onValidationError = "throw",
    lang = "component",
  } = options;

  if (typeof renderer !== "function") {
    throw new Error(
      "[markdown-components] A `renderer` function is required in plugin options.",
    );
  }

  return (tree: Root) => {
    visit(tree, "code", (node: Code, index, parent) => {
      if (!parent || index === undefined) return;
      if (node.lang !== lang) return;

      // Step 1: Parse YAML to JSON
      const rawData = parseYaml(node.value);

      // Step 2: Optionally validate with Zod
      let data = rawData;
      if (schema) {
        data = validateData(rawData, schema, onValidationError);
      }

      // Step 3: Pass to renderer
      const result: RendererResult = renderer(data);

      // Step 4: Replace the code node in the AST
      if (typeof result === "string") {
        // String result → html node
        const htmlNode: ComponentNode = {
          type: "html",
          value: result,
        };
        parent.children.splice(index, 1, htmlNode as any);
      } else if (result && typeof result === "object" && "type" in result) {
        // Custom mdast node
        parent.children.splice(index, 1, result as any);
      } else {
        throw new Error(
          `[markdown-components] Renderer must return a string or a node object with a "type" property. Got: ${typeof result}`,
        );
      }
    });
  };
}

export default remarkComponents;
