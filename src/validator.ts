import type { ZodType, ZodError } from "zod";
import type { ValidationErrorMode } from "./types.js";

export interface ValidationResult<T> {
  success: boolean;
  data: T;
  error?: ZodError;
}

/**
 * Validates parsed YAML data against a Zod schema.
 *
 * @param data - The parsed data to validate
 * @param schema - A Zod schema to validate against
 * @param mode - How to handle validation errors: 'throw' | 'warn' | 'passthrough'
 * @returns The validated (or original) data
 */
export function validateData<T>(
  data: unknown,
  schema: ZodType<T>,
  mode: ValidationErrorMode = "throw",
): T {
  const result = schema.safeParse(data);

  if (result.success) {
    return result.data;
  }

  const errorMessage = formatZodError(result.error);

  switch (mode) {
    case "throw":
      throw new Error(`[fencer] Validation error: ${errorMessage}`);

    case "warn":
      console.warn(`[fencer] Validation warning: ${errorMessage}`);
      return data as T;

    case "passthrough":
      return data as T;

    default: {
      const _exhaustive: never = mode;
      throw new Error(`[fencer] Unknown validation mode: ${_exhaustive}`);
    }
  }
}

/**
 * Formats a ZodError into a human-readable string.
 */
function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? `"${issue.path.join(".")}"` : "root";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}
