import { describe, expect, it } from "vitest"
import { monacoLanguage } from "./code-language"

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
