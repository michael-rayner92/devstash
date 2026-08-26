import type { ReactNode } from "react"

interface FormFieldProps {
  label: string
  /** Associates the label with a control. Omit for fields with no single input (e.g. a type picker). */
  htmlFor?: string
  /** Optional control rendered at the right of the label row (e.g. an AI generate button). */
  action?: ReactNode
  children: ReactNode
}

/** Labeled form field wrapper shared by the item create dialog and edit form. */
export function FormField({ label, htmlFor, action, children }: FormFieldProps) {
  return (
    <div>
      {/* No minimum height: without an action this row is exactly as tall as
          the label was on its own, so every other field's spacing is unchanged. */}
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label
          htmlFor={htmlFor}
          className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {label}
        </label>
        {action}
      </div>
      {children}
    </div>
  )
}
