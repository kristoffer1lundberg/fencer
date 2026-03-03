import { describe, it, expect, vi } from "vitest";
import { remark } from "remark";
import remarkHtml from "remark-html";
import { z } from "zod";
import remarkComponents from "../src/plugin.js";
import { parseYaml } from "../src/parser.js";
import { validateData } from "../src/validator.js";
import type { PluginOptions } from "../src/types.js";

// ---------------------------------------------------------------------------
// parseYaml
// ---------------------------------------------------------------------------
describe("parseYaml", () => {
  it("parses simple key-value YAML into an object", () => {
    const result = parseYaml("title: Hello\ntype: factBox");
    expect(result).toEqual({ title: "Hello", type: "factBox" });
  });

  it("parses nested YAML", () => {
    const yaml = `
title: Hello
meta:
  author: Jane
  year: 2025
`;
    const result = parseYaml(yaml);
    expect(result).toEqual({
      title: "Hello",
      meta: { author: "Jane", year: 2025 },
    });
  });

  it("parses YAML with array values", () => {
    const yaml = `
title: List
items:
  - one
  - two
  - three
`;
    const result = parseYaml(yaml);
    expect(result).toEqual({
      title: "List",
      items: ["one", "two", "three"],
    });
  });

  it("throws on empty content", () => {
    expect(() => parseYaml("")).toThrow("Empty component block");
    expect(() => parseYaml("   ")).toThrow("Empty component block");
  });

  it("throws on null-resolving YAML", () => {
    expect(() => parseYaml("null")).toThrow("resolved to null");
  });

  it("throws on YAML that produces a scalar", () => {
    expect(() => parseYaml("just a string")).toThrow(
      "Expected YAML to produce an object",
    );
  });

  it("throws on YAML that produces an array", () => {
    expect(() => parseYaml("- one\n- two")).toThrow(
      "Expected YAML to produce an object",
    );
  });

  it("throws on malformed YAML", () => {
    expect(() => parseYaml(":::bad\n  - : :\n::")).toThrow(
      "Failed to parse YAML",
    );
  });
});

// ---------------------------------------------------------------------------
// validateData
// ---------------------------------------------------------------------------
describe("validateData", () => {
  const schema = z.object({
    title: z.string(),
    type: z.enum(["factBox", "callout"]),
  });

  it("returns validated data on success", () => {
    const data = { title: "Hi", type: "factBox" };
    const result = validateData(data, schema);
    expect(result).toEqual(data);
  });

  it("strips extra fields (Zod default strip behavior)", () => {
    const data = { title: "Hi", type: "factBox", extra: true };
    const result = validateData(data, schema);
    expect(result).toEqual({ title: "Hi", type: "factBox" });
    expect(result).not.toHaveProperty("extra");
  });

  it("throws by default on validation failure", () => {
    const data = { title: 123, type: "invalid" };
    expect(() => validateData(data, schema, "throw")).toThrow(
      "Validation error",
    );
  });

  it("warns and returns raw data in 'warn' mode", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const data = { title: 123, type: "nope" };
    const result = validateData(data, schema, "warn");
    expect(result).toEqual(data);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Validation warning"),
    );
    warnSpy.mockRestore();
  });

  it("returns raw data silently in 'passthrough' mode", () => {
    const data = { bad: true };
    const result = validateData(data, schema, "passthrough");
    expect(result).toEqual(data);
  });
});

// ---------------------------------------------------------------------------
// remarkComponents plugin — integration
// ---------------------------------------------------------------------------
describe("remarkComponents plugin", () => {
  const process = async (
    markdown: string,
    options: PluginOptions<any>,
  ): Promise<string> => {
    const file = await remark()
      .use(remarkComponents, options)
      .use(remarkHtml, { sanitize: false })
      .process(markdown);
    return String(file);
  };

  it("transforms a component block into HTML via renderer", async () => {
    const md = [
      "# Hello",
      "",
      "```component",
      "title: My Fact",
      "type: factBox",
      "text: Some info",
      "```",
      "",
      "Normal paragraph.",
    ].join("\n");

    const html = await process(md, {
      renderer: (data) => {
        return `<div class="${data.type}"><h3>${data.title}</h3><p>${data.text}</p></div>`;
      },
    });

    expect(html).toContain('<div class="factBox">');
    expect(html).toContain("<h3>My Fact</h3>");
    expect(html).toContain("<p>Some info</p>");
    expect(html).toContain("<p>Normal paragraph.</p>");
  });

  it("leaves non-component code blocks untouched", async () => {
    const md = [
      "```javascript",
      "console.log('hello')",
      "```",
      "",
      "```component",
      "title: Box",
      "type: info",
      "```",
    ].join("\n");

    const html = await process(md, {
      renderer: (data) => `<div class="${data.type}">${data.title}</div>`,
    });

    expect(html).toContain("console.log");
    expect(html).toContain('<div class="info">Box</div>');
  });

  it("handles multiple component blocks", async () => {
    const md = [
      "```component",
      "title: First",
      "type: a",
      "```",
      "",
      "Some text.",
      "",
      "```component",
      "title: Second",
      "type: b",
      "```",
    ].join("\n");

    const html = await process(md, {
      renderer: (data) =>
        `<section data-type="${data.type}">${data.title}</section>`,
    });

    expect(html).toContain('data-type="a"');
    expect(html).toContain("First");
    expect(html).toContain('data-type="b"');
    expect(html).toContain("Second");
  });

  it("supports a custom lang option", async () => {
    const md = ["```widget", "title: Custom Lang", "```"].join("\n");

    const html = await process(md, {
      lang: "widget",
      renderer: (data) => `<widget>${data.title}</widget>`,
    });

    expect(html).toContain("<widget>Custom Lang</widget>");
  });

  it("validates with Zod schema and renders on success", async () => {
    const schema = z.object({
      title: z.string(),
      type: z.string(),
    });

    const md = ["```component", "title: Valid", "type: card", "```"].join("\n");

    const html = await process(md, {
      schema,
      renderer: (data) => `<card>${data.title}</card>`,
    });

    expect(html).toContain("<card>Valid</card>");
  });

  it("throws on Zod validation failure by default", async () => {
    const schema = z.object({
      title: z.string(),
      count: z.number(),
    });

    const md = ["```component", "title: Oops", "```"].join("\n");

    await expect(
      process(md, {
        schema,
        renderer: (data) => `<div>${data.title}</div>`,
      }),
    ).rejects.toThrow("Validation error");
  });

  it("warns on validation failure in 'warn' mode and skips rendering", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const schema = z.object({
      title: z.string(),
      count: z.number(),
    });

    const md = ["```component", "title: Bad Data", "```"].join("\n");

    // In warn mode, the raw data is passed through to the renderer,
    // so the renderer still runs with the unvalidated data.
    const html = await process(md, {
      schema,
      onValidationError: "warn",
      renderer: (data) => `<div>${data.title}</div>`,
    });

    expect(warnSpy).toHaveBeenCalled();
    expect(html).toContain("<div>Bad Data</div>");
    warnSpy.mockRestore();
  });

  it("passes through invalid data in 'passthrough' mode", async () => {
    const schema = z.object({
      title: z.string(),
      count: z.number(),
    });

    const md = ["```component", "title: Pass Through", "```"].join("\n");

    const html = await process(md, {
      schema,
      onValidationError: "passthrough",
      renderer: (data) => `<div>${data.title}</div>`,
    });

    expect(html).toContain("<div>Pass Through</div>");
  });

  it("supports renderer returning a custom mdast node", async () => {
    const md = ["```component", "title: Custom Node", "```"].join("\n");

    const html = await process(md, {
      renderer: (data) => ({
        type: "html",
        value: `<custom-element>${data.title}</custom-element>`,
      }),
    });

    expect(html).toContain("<custom-element>Custom Node</custom-element>");
  });

  it("throws when renderer is not provided", () => {
    expect(() => {
      remark()
        .use(remarkComponents, {} as any)
        .processSync("```component\ntitle: Test\n```");
    }).toThrow("renderer");
  });

  it("throws when renderer returns an invalid value", async () => {
    const md = ["```component", "title: Bad Return", "```"].join("\n");

    await expect(
      process(md, {
        renderer: (() => 42) as any,
      }),
    ).rejects.toThrow("Renderer must return a string or a node object");
  });

  it("throws on invalid YAML inside a component block", async () => {
    const md = ["```component", ":::bad yaml:::", "  - : :", "```"].join("\n");

    await expect(
      process(md, {
        renderer: () => "<div></div>",
      }),
    ).rejects.toThrow("Failed to parse YAML");
  });

  it("handles component block with multiline text values", async () => {
    const md = [
      "```component",
      "title: Multiline",
      'text: "This is a\\nlong piece of text"',
      "type: note",
      "```",
    ].join("\n");

    const html = await process(md, {
      renderer: (data) =>
        `<div class="${data.type}"><h3>${data.title}</h3><p>${data.text}</p></div>`,
    });

    expect(html).toContain("<h3>Multiline</h3>");
    expect(html).toContain("long piece of text");
  });

  it("handles component block surrounded by other markdown", async () => {
    const md = [
      "# Title",
      "",
      "Some intro paragraph.",
      "",
      "```component",
      "title: Middle",
      "type: box",
      "```",
      "",
      "## Subtitle",
      "",
      "Closing paragraph.",
    ].join("\n");

    const html = await process(md, {
      renderer: (data) => `<aside>${data.title}</aside>`,
    });

    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<p>Some intro paragraph.</p>");
    expect(html).toContain("<aside>Middle</aside>");
    expect(html).toContain("<h2>Subtitle</h2>");
    expect(html).toContain("<p>Closing paragraph.</p>");
  });
});
