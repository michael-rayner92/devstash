"use client"

import { ChevronDown } from "lucide-react"
import { FormField } from "@/components/items/form-field"
import { languageOptions } from "@/lib/code-language"

interface LanguageSelectProps {
  /** DOM id for label association. */
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

/**
 * The "Language" dropdown for code items (snippet, command). Rendered directly
 * above the content editor, since changing it re-highlights the editor live.
 * Shared by the item create dialog and the drawer edit form.
 *
 * The native select arrow is suppressed and redrawn as a positioned icon —
 * Chrome pins its own arrow a few pixels off the right edge and ignores
 * `padding-right`, so the inset is only controllable with a custom chevron.
 */
export function LanguageSelect({ id, value, onChange, disabled }: LanguageSelectProps) {
  return (
    <FormField label="Language" htmlFor={id}>
      <div className="relative">
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="flex h-9 w-full appearance-none rounded-md border border-input bg-transparent pl-3 pr-9 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {languageOptions(value).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
      </div>
    </FormField>
  )
}
