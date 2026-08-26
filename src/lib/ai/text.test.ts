import { describe, expect, it } from "vitest"
import { stripOuterFence } from "@/lib/ai/text"

describe("stripOuterFence", () => {
  it("drops a fence wrapping the whole reply", () => {
    expect(stripOuterFence("```\nhello\n```")).toBe("hello")
    expect(stripOuterFence("```markdown\nhello\n```")).toBe("hello")
  })

  it("leaves unfenced text alone", () => {
    expect(stripOuterFence("hello")).toBe("hello")
    expect(stripOuterFence("")).toBe("")
  })

  /**
   * The guard that matters: the regex's lazy body would otherwise match only
   * the first fenced block and silently throw the rest of the reply away.
   */
  it("leaves a reply that merely contains a fenced block intact", () => {
    const text = "```js\nfoo()\n```\n\nsome prose"

    expect(stripOuterFence(text)).toBe(text)
  })

  it("keeps the body's own indentation and blank lines", () => {
    expect(stripOuterFence("```\nline one\n\n  indented\n```")).toBe("line one\n\n  indented")
  })
})
