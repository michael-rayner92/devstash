/**
 * Item type colors (stored on `ItemType.color`) are picked to read well as
 * borders and icon fills, where saturation carries the meaning. Used as small
 * text on the dark card surface some of them fall under the WCAG AA 4.5:1
 * threshold — `snippet` (#3b82f6) measured 4.22:1 at 12px.
 *
 * `typeTextColor` mixes the stored color toward white so text usages clear AA
 * while keeping the hue recognizable, without changing the seeded colors (which
 * would also lighten every border and gradient that reads fine today).
 */
const TEXT_MIX_PERCENT = 72

export function typeTextColor(color: string): string {
  return `color-mix(in oklab, ${color} ${TEXT_MIX_PERCENT}%, white)`
}
