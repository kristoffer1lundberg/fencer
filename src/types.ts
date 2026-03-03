import type { Node } from "unist";
import type { ZodType } from "zod";

/**
 * A custom mdast node representing a rendered component.
 * Used when the renderer returns an object instead of a string.
 */
export interface ComponentNode extends Node {
  type: "html" | string;
  value?: string;
  data?: Record<string, unknown>;
  children?: Node[];
}

/**
 * The result a renderer function can return.
 * - `string`: treated as raw HTML and injected as an `html` mdast node
 * - `ComponentNode`: a custom mdast node that downstream plugins can handle
 */
export type RendererResult = string | ComponentNode;

/**
 * A function that receives the parsed (and optionally validated) component data
 * and returns either an HTML string or a custom mdast node.
 */
export type Renderer<T = Record<string, unknown>> = (data: T) => RendererResult;

/**
 * Determines what happens when Zod validation fails:
 * - `'throw'`: throws an error (default)
 * - `'warn'`: logs a warning to console and skips the block
 * - `'passthrough'`: ignores the validation error and passes the raw data to the renderer
 */
export type ValidationErrorMode = "throw" | "warn" | "passthrough";

/**
 * Options for the remark-components plugin.
 *
 * @typeParam T - The shape of the parsed component data. Inferred from the Zod schema if provided.
 */
export interface PluginOptions<T = Record<string, unknown>> {
  /**
   * A Zod schema to validate parsed YAML against.
   * When provided, the renderer's `data` argument will be typed as `z.infer<typeof schema>`.
   * Optional — if omitted, the raw parsed YAML object is passed through.
   */
  schema?: ZodType<T>;

  /**
   * A function that receives the parsed (and validated) component data
   * and returns either an HTML string or a custom mdast node.
   */
  renderer: Renderer<T>;

  /**
   * What to do when Zod validation fails.
   * @default 'throw'
   */
  onValidationError?: ValidationErrorMode;

  /**
   * The language identifier used on fenced code blocks to mark them as components.
   * @default 'component'
   */
  lang?: string;
}
