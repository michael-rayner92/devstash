import type { ReactNode } from "react"

interface FormFieldProps {
  label: string
  /** Associates the label with a control. Omit for fields with no single input (e.g. a type picker). */
  htmlFor?: string
  children: ReactNode
}

/** Labeled form field wrapper shared by the item create dialog and edit form. */
export function FormField({ label, htmlFor, children }: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </label>
      {children}
    </div>
  )
}
