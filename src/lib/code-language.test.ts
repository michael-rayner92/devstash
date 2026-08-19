import { describe, expect, it } from "vitest"
import { LANGUAGE_OPTIONS, languageOptions, monacoLanguage } from "./code-language"

describe("monacoLanguage", () => {
  it("returns plaintext for empty / nullish input", () => {
    expect(monacoLanguage()).toBe("plaintext")
    expect(monacoLanguage(null)).toBe("plaintext")
    expect(monacoLanguage("")).toBe("plaintext")
    expect(monacoLanguage("   ")).toBe("plaintext")
  })

  it("maps common aliases to Monaco language ids", () => {
    expect(monacoLanguage("js")).toBe("javascript")
    expect(monacoLanguage("ts")).toBe("typescript")
    expect(monacoLanguage("tsx")).toBe("typescript")
    expect(monacoLanguage("sh")).toBe("shell")
    expect(monacoLanguage("bash")).toBe("shell")
    expect(monacoLanguage("py")).toBe("python")
    expect(monacoLanguage("c#")).toBe("csharp")
    expect(monacoLanguage("golang")).toBe("go")
  })

  it("normalizes casing and surrounding whitespace", () => {
    expect(monacoLanguage("TypeScript")).toBe("typescript")
    expect(monacoLanguage("  JS  ")).toBe("javascript")
  })

  it("passes through canonical ids unchanged", () => {
    expect(monacoLanguage("python")).toBe("python")
    expect(monacoLanguage("json")).toBe("json")
  })

  it("falls back to the lowercased input for unknown languages", () => {
    expect(monacoLanguage("Rust")).toBe("rust")
    expect(monacoLanguage("elixir")).toBe("elixir")
  })
})

describe("languageOptions", () => {
  it("returns the base list for an empty or nullish value", () => {
    expect(languageOptions()).toBe(LANGUAGE_OPTIONS)
    expect(languageOptions(null)).toBe(LANGUAGE_OPTIONS)
    expect(languageOptions("")).toBe(LANGUAGE_OPTIONS)
    expect(languageOptions("   ")).toBe(LANGUAGE_OPTIONS)
  })

  it("returns the base list for a listed language", () => {
    expect(languageOptions("typescript")).toBe(LANGUAGE_OPTIONS)
    expect(languageOptions("dockerfile")).toBe(LANGUAGE_OPTIONS)
  })

  it("appends an unlisted language so an existing value is preserved", () => {
    const options = languageOptions("brainfuck")
    expect(options).toHaveLength(LANGUAGE_OPTIONS.length + 1)
    expect(options.at(-1)).toEqual({ value: "brainfuck", label: "brainfuck" })
    expect(LANGUAGE_OPTIONS).toHaveLength(options.length - 1)
  })

  it("offers a none option and canonical Monaco ids that need no aliasing", () => {
    expect(LANGUAGE_OPTIONS[0]).toEqual({ value: "", label: "None" })
    for (const { value } of LANGUAGE_OPTIONS.slice(1)) {
      expect(monacoLanguage(value)).toBe(value)
    }
  })
})
