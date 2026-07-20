import type { ItemType } from "@/generated/prisma/client"

/**
 * Given the item types of a collection's items (one entry per item, with
 * repeats), returns the most frequent type plus the set of distinct types in
 * first-seen order. The dominant type is the one with the highest item count;
 * ties resolve to whichever type was seen first.
 */
export function computeDominantType(itemTypes: ItemType[]): {
  dominantType: ItemType | null
  allTypes: ItemType[]
} {
  const counts = new Map<string, { type: ItemType; count: number }>()
  for (const type of itemTypes) {
    const entry = counts.get(type.id)
    if (entry) entry.count++
    else counts.set(type.id, { type, count: 1 })
  }

  let dominantType: ItemType | null = null
  let maxCount = 0
  for (const { type, count } of counts.values()) {
    if (count > maxCount) {
      dominantType = type
      maxCount = count
    }
  }

  return {
    dominantType,
    allTypes: Array.from(counts.values()).map((v) => v.type),
  }
}
