import { visit } from 'unist-util-visit';
import { parse } from 'yaml';

// src/plugin.ts
function parseYaml(content) {
  if (!content || content.trim().length === 0) {
    throw new Error(
      "[markdown-components] Empty component block \u2014 expected YAML content."
    );
  }
  let parsed;
  try {
    parsed = parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[markdown-components] Failed to parse YAML: ${message}`);
  }
  if (parsed === null || parsed === void 0) {
    throw new Error(
      "[markdown-components] YAML content resolved to null or undefined."
    );
  }
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(
      `[markdown-components] Expected YAML to produce an object, but got ${Array.isArray(parsed) ? "an array" : typeof parsed}.`
    );
  }
  return parsed;
}

// src/validator.ts
function validateData(data, schema, mode = "throw") {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  const errorMessage = formatZodError(result.error);
  switch (mode) {
    case "throw":
      throw new Error(`[markdown-components] Validation error: ${errorMessage}`);
    case "warn":
      console.warn(`[markdown-components] Validation warning: ${errorMessage}`);
      return data;
    case "passthrough":
      return data;
    default: {
      const _exhaustive = mode;
      throw new Error(`[markdown-components] Unknown validation mode: ${_exhaustive}`);
    }
  }
}
function formatZodError(error) {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `"${issue.path.join(".")}"` : "root";
    return `${path}: ${issue.message}`;
  }).join("; ");
}

// src/plugin.ts
function remarkComponents(options) {
  const {
    renderer,
    schema,
    onValidationError = "throw",
    lang = "component"
  } = options;
  if (typeof renderer !== "function") {
    throw new Error(
      "[markdown-components] A `renderer` function is required in plugin options."
    );
  }
  return (tree) => {
    visit(tree, "code", (node, index, parent) => {
      if (!parent || index === void 0) return;
      if (node.lang !== lang) return;
      const rawData = parseYaml(node.value);
      let data = rawData;
      if (schema) {
        data = validateData(rawData, schema, onValidationError);
      }
      const result = renderer(data);
      if (typeof result === "string") {
        const htmlNode = {
          type: "html",
          value: result
        };
        parent.children.splice(index, 1, htmlNode);
      } else if (result && typeof result === "object" && "type" in result) {
        parent.children.splice(index, 1, result);
      } else {
        throw new Error(
          `[markdown-components] Renderer must return a string or a node object with a "type" property. Got: ${typeof result}`
        );
      }
    });
  };
}

export { remarkComponents as default, parseYaml, remarkComponents, validateData };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map