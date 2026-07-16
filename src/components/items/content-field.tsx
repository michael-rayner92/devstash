import { CodeEditor } from "@/components/ui/code-editor"
import { MarkdownEditor } from "@/components/ui/markdown-editor"
import { Textarea } from "@/components/ui/textarea"
import { FormField } from "@/components/items/form-field"
import { isCodeType, isMarkdownType } from "@/lib/item-fields"

interface ContentFieldProps {
  /** DOM id for label association; also the editor's id. */
  id: string
  /** Item type name — selects the editor (code vs markdown vs plain textarea). */
  typeName: string
  value: string
  onChange: (value: string) => void
  /** Language label + syntax highlighting, for code types. */
  language?: string
  /** Rows for the plain-textarea fallback (non-code, non-markdown types). */
  rows?: number
}

/**
 * The "Content" form field: renders the right editor for an item type — Monaco
 * for code types (snippet/command), the markdown editor for note/prompt, and a
 * plain textarea otherwise. Shared by the item create dialog and edit form.
 */
export function ContentField({ id, typeName, value, onChange, language, rows = 8 }: ContentFieldProps) {
  return (
    <FormField label="Content" htmlFor={id}>
      {isCodeType(typeName) ? (
        <CodeEditor id={id} ariaLabel="Content" value={value} language={language} onChange={onChange} />
      ) : isMarkdownType(typeName) ? (
        <MarkdownEditor
          id={id}
          ariaLabel="Content"
          value={value}
          onChange={onChange}
          placeholder="Item content (Markdown supported)"
        />
      ) : (
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="font-mono"
          placeholder="Item content"
        />
      )}
    </FormField>
  )
}
