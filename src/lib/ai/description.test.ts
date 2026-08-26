import { describe, expect, it } from "vitest"
import {
  MAX_DESCRIPTION_CHARS,
  buildDescriptionInput,
  hasDescribableInput,
  parseDescription,
} from "@/lib/ai/description"
import {
  MAX_AI_CONTENT_CHARS,
  MAX_AI_FILE_NAME_CHARS,
  MAX_AI_LABEL_CHARS,
  MAX_AI_TITLE_CHARS,
  MAX_AI_URL_CHARS,
} from "@/lib/ai/limits"
import type { DescriptionSource } from "@/lib/ai/description"

const EMPTY: DescriptionSource = {
  typeName: "snippet",
  title: "",
  content: null,
  language: null,
  url: null,
  fileName: null,
}

function source(overrides: Partial<DescriptionSource> = {}): DescriptionSource {
  return { ...EMPTY, ...overrides }
}

describe("buildDescriptionInput", () => {
  it("always includes the type and title", () => {
    const input = buildDescriptionInput(source({ title: "Debounce hook" }))

    expect(input).toContain("Type: snippet")
    expect(input).toContain("Title: Debounce hook")
  })

  it("marks a missing title rather than omitting the section", () => {
    expect(buildDescriptionInput(source({ content: "SELECT 1" }))).toContain("Title: (none)")
  })

  it("omits sections for fields that are absent", () => {
    const input = buildDescriptionInput(source({ title: "Just a title" }))

    expect(input).not.toContain("Language:")
    expect(input).not.toContain("URL:")
    expect(input).not.toContain("File name:")
    expect(input).not.toContain("Content:")
  })

  it("includes every populated field", () => {
    const input = buildDescriptionInput(
      source({
        typeName: "command",
        title: "Tail pod logs",
        content: "kubectl logs -f deploy/api",
        language: "shell",
        url: "https://example.com/docs",
        fileName: "notes.md",
      })
    )

    expect(input).toContain("Type: command")
    expect(input).toContain("Language: shell")
    expect(input).toContain("URL: https://example.com/docs")
    expect(input).toContain("File name: notes.md")
    expect(input).toContain("kubectl logs -f deploy/api")
  })

  // Each of these caps is what bounds the cost of a single call — a crafted
  // request can put a megabyte in any of these fields.
  it("truncates the content", () => {
    const content = "a".repeat(MAX_AI_CONTENT_CHARS + 500)
    const input = buildDescriptionInput(source({ title: "t", content }))

    expect(input).toContain("a".repeat(MAX_AI_CONTENT_CHARS))
    expect(input).not.toContain("a".repeat(MAX_AI_CONTENT_CHARS + 1))
  })

  it("truncates the title", () => {
    const input = buildDescriptionInput(source({ title: "t".repeat(MAX_AI_TITLE_CHARS + 5000) }))

    expect(input).toContain("t".repeat(MAX_AI_TITLE_CHARS))
    expect(input).not.toContain("t".repeat(MAX_AI_TITLE_CHARS + 1))
  })

  it("truncates the url", () => {
    const input = buildDescriptionInput(source({ url: "u".repeat(MAX_AI_URL_CHARS + 5000) }))

    expect(input).toContain("u".repeat(MAX_AI_URL_CHARS))
    expect(input).not.toContain("u".repeat(MAX_AI_URL_CHARS + 1))
  })

  it("truncates the file name", () => {
    const input = buildDescriptionInput(
      source({ fileName: "f".repeat(MAX_AI_FILE_NAME_CHARS + 5000) })
    )

    expect(input).toContain("f".repeat(MAX_AI_FILE_NAME_CHARS))
    expect(input).not.toContain("f".repeat(MAX_AI_FILE_NAME_CHARS + 1))
  })
})

describe("hasDescribableInput", () => {
  it("is false when every usable field is empty", () => {
    expect(hasDescribableInput(source())).toBe(false)
    expect(hasDescribableInput(source({ title: "   ", content: "  " }))).toBe(false)
  })

  it("is true given any one usable field", () => {
    expect(hasDescribableInput(source({ title: "Something" }))).toBe(true)
    expect(hasDescribableInput(source({ content: "body" }))).toBe(true)
    expect(hasDescribableInput(source({ url: "https://example.com" }))).toBe(true)
    expect(hasDescribableInput(source({ fileName: "diagram.png" }))).toBe(true)
  })

  // The type and language are always derivable from the form, so on their own
  // they would let the button fire with nothing to actually describe.
  it("ignores the type and language", () => {
    expect(hasDescribableInput(source({ typeName: "snippet", language: "typescript" }))).toBe(
      false
    )
  })
})

describe("parseDescription", () => {
  it("returns clean text unchanged", () => {
    const text = "Debounces a value with a configurable delay. Useful for search inputs."

    expect(parseDescription(text)).toBe(text)
  })

  it("returns an empty string for blank output", () => {
    expect(parseDescription("")).toBe("")
    expect(parseDescription("   \n  ")).toBe("")
  })

  it("collapses newlines into one paragraph", () => {
    expect(parseDescription("First sentence.\n\nSecond sentence.")).toBe(
      "First sentence. Second sentence."
    )
  })

  it("strips a leading label", () => {
    expect(parseDescription("Description: Tails logs from a deployment.")).toBe(
      "Tails logs from a deployment."
    )
    expect(parseDescription("Summary: Tails logs.")).toBe("Tails logs.")
  })

  it("strips wrapping quotes", () => {
    expect(parseDescription('"Tails logs from a deployment."')).toBe(
      "Tails logs from a deployment."
    )
    expect(parseDescription("“Tails logs.”")).toBe("Tails logs.")
  })

  it("does not strip an unmatched quote", () => {
    expect(parseDescription('Uses the "kubectl" CLI.')).toBe('Uses the "kubectl" CLI.')
  })

  it("unwraps a fenced block", () => {
    expect(parseDescription('```\nTails logs from a deployment.\n```')).toBe(
      "Tails logs from a deployment."
    )
  })

  it("truncates an over-long response at the last full sentence", () => {
    const first = `${"a".repeat(200)}.`
    const second = `${"b".repeat(200)}.`
    const result = parseDescription(`${first} ${second}`)

    expect(result).toBe(first)
    expect(result.length).toBeLessThanOrEqual(MAX_DESCRIPTION_CHARS)
  })

  it("falls back to a word boundary and an ellipsis with no sentence break", () => {
    const result = parseDescription(`${"word ".repeat(200)}end`)

    expect(result.length).toBeLessThanOrEqual(MAX_DESCRIPTION_CHARS)
    expect(result.endsWith("…")).toBe(true)
    expect(result).not.toContain("  ")
  })
})

// The label and the quotes nest in either order; a single ordered pass would
// leave the label behind in one of the two.
describe("parseDescription with a nested label and quotes", () => {
  it("strips a label inside quotes", () => {
    expect(parseDescription('"Description: Tails the API logs."')).toBe("Tails the API logs.")
  })

  it("strips quotes inside a label", () => {
    expect(parseDescription('Description: "Tails the API logs."')).toBe("Tails the API logs.")
  })
})

// The type name and language are not validated against a list before reaching
// the prompt, so their cap is what bounds what can be smuggled in.
describe("buildDescriptionInput label caps", () => {
  it("truncates the type name and language", () => {
    const input = buildDescriptionInput(
      source({
        typeName: "T".repeat(MAX_AI_LABEL_CHARS + 500),
        language: "L".repeat(MAX_AI_LABEL_CHARS + 500),
        title: "t",
      })
    )

    expect(input).toContain("T".repeat(MAX_AI_LABEL_CHARS))
    expect(input).not.toContain("T".repeat(MAX_AI_LABEL_CHARS + 1))
    expect(input).toContain("L".repeat(MAX_AI_LABEL_CHARS))
    expect(input).not.toContain("L".repeat(MAX_AI_LABEL_CHARS + 1))
  })
})
