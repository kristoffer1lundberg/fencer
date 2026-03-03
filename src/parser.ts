import { parse } from "yaml";

/**
 * Parses a YAML string into a plain JavaScript object.
 *
 * @param content - The raw YAML string from inside a fenced code block
 * @returns The parsed data as a plain object
 * @throws If the YAML is malformed or cannot be parsed
 */
export function parseYaml(content: string): Record<string, unknown> {
  if (!content || content.trim().length === 0) {
    throw new Error("[fencer] Empty component block — expected YAML content.");
  }

  let parsed: unknown;

  try {
    parsed = parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[fencer] Failed to parse YAML: ${message}`);
  }

  if (parsed === null || parsed === undefined) {
    throw new Error("[fencer] YAML content resolved to null or undefined.");
  }

  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(
      `[fencer] Expected YAML to produce an object, but got ${Array.isArray(parsed) ? "an array" : typeof parsed}.`,
    );
  }

  return parsed as Record<string, unknown>;
}
