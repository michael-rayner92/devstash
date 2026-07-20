"use client"

import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import { FormField } from "@/components/items/form-field"
import { cn } from "@/lib/utils"

interface CollectionOption {
  id: string
  name: string
}

interface CollectionsFieldProps {
  selected: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

/**
 * Multi-select of the signed-in user's collections, shown as toggle pills.
 * Fetches the list from `GET /api/collections` on mount (the item forms are
 * client components, so they can't receive it as a server prop). Selecting
 * zero, one, or many is all valid.
 */
export function CollectionsField({ selected, onChange, disabled }: CollectionsFieldProps) {
  const [options, setOptions] = useState<CollectionOption[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    fetch("/api/collections")
      .then((res) => {
        if (!res.ok) throw new Error("Request failed")
        return res.json()
      })
      .then((data: CollectionOption[]) => {
        if (active) setOptions(data)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
    return () => {
      active = false
    }
  }, [])

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }

  return (
    <FormField label="Collections">
      {failed ? (
        <p className="text-sm text-muted-foreground/60">Couldn&apos;t load collections.</p>
      ) : options === null ? (
        <p className="text-sm text-muted-foreground/60">Loading…</p>
      ) : options.length === 0 ? (
        <p className="text-sm text-muted-foreground/60">No collections yet.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {options.map((collection) => {
            const isSelected = selected.includes(collection.id)
            return (
              <button
                key={collection.id}
                type="button"
                onClick={() => toggle(collection.id)}
                disabled={disabled}
                aria-pressed={isSelected}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors disabled:opacity-50",
                  isSelected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                {isSelected && <Check className="h-3 w-3" />}
                {collection.name}
              </button>
            )
          })}
        </div>
      )}
    </FormField>
  )
}
