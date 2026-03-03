import { Root } from 'mdast';
import { Plugin } from 'unified';
import { Node } from 'unist';
import { ZodType } from 'zod';

/**
 * A custom mdast node representing a rendered component.
 * Used when the renderer returns an object instead of a string.
 */
interface ComponentNode extends Node {
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
type RendererResult = string | ComponentNode;
/**
 * A function that receives the parsed (and optionally validated) component data
 * and returns either an HTML string or a custom mdast node.
 */
type Renderer<T = Record<string, unknown>> = (data: T) => RendererResult;
/**
 * Determines what happens when Zod validation fails:
 * - `'throw'`: throws an error (default)
 * - `'warn'`: logs a warning to console and skips the block
 * - `'passthrough'`: ignores the validation error and passes the raw data to the renderer
 */
type ValidationErrorMode = "throw" | "warn" | "passthrough";
/**
 * Options for the remark-components plugin.
 *
 * @typeParam T - The shape of the parsed component data. Inferred from the Zod schema if provided.
 */
interface PluginOptions<T = Record<string, unknown>> {
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

/**
 * A remark plugin that transforms fenced code blocks marked with a specific
 * language tag (default: `component`) into custom rendered output.
 *
 * The content inside the fenced block is parsed as YAML, optionally validated
 * against a Zod schema, and then passed to a user-supplied renderer function.
 */
declare const fencer: Plugin<[PluginOptions<any>], Root>;

/**
 * Parses a YAML string into a plain JavaScript object.
 *
 * @param content - The raw YAML string from inside a fenced code block
 * @returns The parsed data as a plain object
 * @throws If the YAML is malformed or cannot be parsed
 */
declare function parseYaml(content: string): Record<string, unknown>;

/**
 * Validates parsed YAML data against a Zod schema.
 *
 * @param data - The parsed data to validate
 * @param schema - A Zod schema to validate against
 * @param mode - How to handle validation errors: 'throw' | 'warn' | 'passthrough'
 * @returns The validated (or original) data
 */
declare function validateData<T>(data: unknown, schema: ZodType<T>, mode?: ValidationErrorMode): T;

export { type ComponentNode, type PluginOptions, type Renderer, type RendererResult, type ValidationErrorMode, fencer as default, fencer, parseYaml, validateData };
