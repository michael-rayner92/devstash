import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { relativeTime } from "@/lib/relative-time"

const NOW = new Date("2026-07-01T12:00:00.000Z")

describe("relativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("formats sub-hour durations in minutes", () => {
    expect(relativeTime(new Date(NOW.getTime() - 5 * 60 * 1000))).toBe("5m ago")
  })

  it("formats sub-day durations in hours", () => {
    expect(relativeTime(new Date(NOW.getTime() - 2 * 60 * 60 * 1000))).toBe("2h ago")
  })

  it("labels a duration between one and two days as 'Yesterday'", () => {
    expect(relativeTime(new Date(NOW.getTime() - 30 * 60 * 60 * 1000))).toBe("Yesterday")
  })

  it("formats sub-week durations in days", () => {
    expect(relativeTime(new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000))).toBe("3d ago")
  })

  it("formats durations of a week or more in weeks", () => {
    expect(relativeTime(new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000))).toBe("1w ago")
  })
})
