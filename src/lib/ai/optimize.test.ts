import { describe, expect, it } from "vitest"
import {
  MAX_OPTIMIZE_CHANGES,
  MAX_OPTIMIZED_PROMPT_CHARS,
  OPTIMIZE_INSTRUCTIONS,
  buildOptimizeInput,
  hasOptimizableInput,
  parseOptimizedPrompt,
} from "@/lib/ai/optimize"
import { MAX_AI_PROMPT_CHARS, MAX_AI_TITLE_CHARS } from "@/lib/ai/limits"

const SOURCE = {
  title: "Blog post writer",
  content: "Write a blog post about {{topic}}.",
}

/** Build the model reply shape the action feeds to `parseOptimizedPrompt`. */
function reply(optimized: string, changes: unknown[] = ["Named the output format"]) {
  return JSON.stringify({ optimized, changes })
}

describe("buildOptimizeInput", () => {
  it("includes the title and the prompt in labelled sections", () => {
    const input = buildOptimizeInput(SOURCE)

    expect(input).toContain("Title: Blog post writer")
    expect(input).toContain('Prompt:\n"""\nWrite a blog post about {{topic}}.\n"""')
  })

  it("falls back to a placeholder for a blank title", () => {
    expect(buildOptimizeInput({ ...SOURCE, title: "   " })).toContain("Title: (none)")
  })

  it("truncates the title and the prompt to their caps", () => {
    const input = buildOptimizeInput({
      title: "t".repeat(MAX_AI_TITLE_CHARS + 50),
      content: "p".repeat(MAX_AI_PROMPT_CHARS + 500),
    })

    expect(input).toContain("t".repeat(MAX_AI_TITLE_CHARS))
    expect(input).not.toContain("t".repeat(MAX_AI_TITLE_CHARS + 1))
    expect(input).toContain("p".repeat(MAX_AI_PROMPT_CHARS))
    expect(input).not.toContain("p".repeat(MAX_AI_PROMPT_CHARS + 1))
  })

  it("tells the model when the prompt was truncated, so it doesn't invent an ending", () => {
    const clipped = buildOptimizeInput({ ...SOURCE, content: "p".repeat(MAX_AI_PROMPT_CHARS + 1) })
    expect(clipped).toContain("truncated")

    expect(buildOptimizeInput(SOURCE)).not.toContain("truncated")
  })

  /**
   * Regression guard. With `text.format` of type `json_object` the API rejects
   * the request unless the word "json" appears in `input` — having it in
   * `instructions` alone is not enough, and the failure is a 400 at call time.
   */
  it("mentions json in the input itself, not just the instructions", () => {
    expect(buildOptimizeInput(SOURCE).toLowerCase()).toContain("json")
  })
})

describe("OPTIMIZE_INSTRUCTIONS", () => {
  it("tells the model to leave an already-good prompt alone", () => {
    expect(OPTIMIZE_INSTRUCTIONS).toContain("return it exactly as written")
  })

  it("guards against executing the prompt it is given", () => {
    expect(OPTIMIZE_INSTRUCTIONS).toContain("never carry it out")
  })

  it("asks for no more changes than the panel renders", () => {
    expect(OPTIMIZE_INSTRUCTIONS).toContain(`at most ${MAX_OPTIMIZE_CHANGES} changes`)
  })
})

describe("hasOptimizableInput", () => {
  it("is true for a prompt with content", () => {
    expect(hasOptimizableInput({ content: "Write a haiku" })).toBe(true)
  })

  it("is false for a whitespace-only body, which is truthy in the DB", () => {
    expect(hasOptimizableInput({ content: "   \n\t " })).toBe(false)
    expect(hasOptimizableInput({ content: "" })).toBe(false)
  })
})

describe("parseOptimizedPrompt", () => {
  it("returns the rewrite and its rationale bullets", () => {
    const raw = reply("You are a technical writer. Write about {{topic}}.", [
      "Added an explicit role",
      "Named the output format",
    ])

    expect(parseOptimizedPrompt(raw, SOURCE.content)).toEqual({
      optimized: "You are a technical writer. Write about {{topic}}.",
      changes: ["Added an explicit role", "Named the output format"],
      unchanged: false,
    })
  })

  it("flags an unmodified rewrite as unchanged and drops its changes", () => {
    const result = parseOptimizedPrompt(reply(SOURCE.content, ["Tightened wording"]), SOURCE.content)

    expect(result).toEqual({ optimized: SOURCE.content, changes: [], unchanged: true })
  })

  /**
   * Text equality decides `unchanged`, not the model's own report: a reply
   * differing only in trailing whitespace or line endings would otherwise offer
   * a "Use this prompt" button that saves nothing visible.
   */
  it("treats trailing-whitespace and line-ending differences as unchanged", () => {
    const original = "Line one\nLine two"
    const cosmetic = "Line one   \r\nLine two\n\n"

    expect(parseOptimizedPrompt(reply(cosmetic, []), original)?.unchanged).toBe(true)
  })

  it("reports a real change even when the model listed none", () => {
    const result = parseOptimizedPrompt(reply("A materially different prompt.", []), SOURCE.content)

    expect(result).toMatchObject({ unchanged: false, changes: [] })
  })

  it("caps, trims and de-bullets the rationale list", () => {
    const raw = reply("A different prompt", [
      "- Added a role",
      "  * Named the format  ",
      "Third",
      "Fourth",
      "Fifth",
    ])

    expect(parseOptimizedPrompt(raw, SOURCE.content)?.changes).toEqual([
      "Added a role",
      "Named the format",
      "Third",
      "Fourth",
    ])
  })

  /** The panel keys its list on the bullet text, so repeats would collide. */
  it("dedupes repeated rationale bullets", () => {
    const raw = reply("A different prompt", [
      "Added a role",
      "Added a role",
      "Named the format",
    ])

    expect(parseOptimizedPrompt(raw, SOURCE.content)?.changes).toEqual([
      "Added a role",
      "Named the format",
    ])
  })

  it("drops non-string and empty entries from the rationale list", () => {
    const raw = reply("A different prompt", ["Added a role", 42, null, "   ", { a: 1 }])

    expect(parseOptimizedPrompt(raw, SOURCE.content)?.changes).toEqual(["Added a role"])
  })

  it("tolerates a missing or non-array changes field", () => {
    expect(parseOptimizedPrompt('{"optimized":"A different prompt"}', SOURCE.content)).toEqual({
      optimized: "A different prompt",
      changes: [],
      unchanged: false,
    })
    expect(
      parseOptimizedPrompt('{"optimized":"A different prompt","changes":"nope"}', SOURCE.content)
        ?.changes
    ).toEqual([])
  })

  it("unwraps a code fence the model wrapped the whole rewrite in", () => {
    const raw = reply("```\nYou are a technical writer.\n```")

    expect(parseOptimizedPrompt(raw, SOURCE.content)?.optimized).toBe(
      "You are a technical writer."
    )
  })

  /**
   * Observed against the real API: the model returned its whole rewrite wrapped
   * in `"…"`, which would otherwise have been saved into the user's prompt.
   */
  it("strips a quote pair the model wrapped the whole rewrite in", () => {
    const raw = reply('"Role: You are a technical writer. Write about {{topic}}."')

    expect(parseOptimizedPrompt(raw, SOURCE.content)?.optimized).toBe(
      "Role: You are a technical writer. Write about {{topic}}."
    )
  })

  it("leaves a rewrite that merely opens and closes with unrelated quotes intact", () => {
    const optimized = '"Hello" is the greeting. Reply with "Goodbye"'

    expect(parseOptimizedPrompt(reply(optimized), SOURCE.content)?.optimized).toBe(optimized)
  })

  it("leaves a rewrite that legitimately contains a fenced example intact", () => {
    const optimized = "Reply in this shape:\n\n```json\n{\"a\": 1}\n```\n\nBe concise."
    const result = parseOptimizedPrompt(reply(optimized), SOURCE.content)

    expect(result?.optimized).toBe(optimized)
  })

  it("returns null for output that isn't JSON", () => {
    expect(parseOptimizedPrompt("Sure! Here's a better prompt:", SOURCE.content)).toBeNull()
    expect(parseOptimizedPrompt("", SOURCE.content)).toBeNull()
  })

  it("returns null when the reply has no optimized field", () => {
    expect(parseOptimizedPrompt('{"changes":["did stuff"]}', SOURCE.content)).toBeNull()
    expect(parseOptimizedPrompt('["a","b"]', SOURCE.content)).toBeNull()
  })

  it("returns null for an empty rewrite rather than saving nothing over the prompt", () => {
    expect(parseOptimizedPrompt(reply("   "), SOURCE.content)).toBeNull()
  })

  /**
   * Rejected rather than truncated, unlike `parseExplanation`: this text is
   * about to become the user's saved prompt, and one severed mid-instruction is
   * broken in a way that outlives the request.
   */
  it("rejects an over-long rewrite instead of truncating it", () => {
    const tooLong = "x".repeat(MAX_OPTIMIZED_PROMPT_CHARS + 1)

    expect(parseOptimizedPrompt(reply(tooLong), SOURCE.content)).toBeNull()
    expect(
      parseOptimizedPrompt(reply("x".repeat(MAX_OPTIMIZED_PROMPT_CHARS)), SOURCE.content)
    ).not.toBeNull()
  })
})
