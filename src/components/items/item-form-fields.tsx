"use client"

import type { ReactNode } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormField } from "@/components/items/form-field"
import { ContentField } from "@/components/items/content-field"
import { CollectionsField } from "@/components/items/collections-field"
import { LanguageSelect } from "@/components/items/language-select"
import { SuggestTags } from "@/components/items/suggest-tags"
import { SuggestDescription } from "@/components/items/suggest-description"
import { itemFieldVisibility } from "@/lib/item-fields"
import { appendTag, parseTagList } from "@/lib/item-tags"

/** The text state an item form holds. Tags stay one comma-separated string. */
export interface ItemFormValues {
  title: string
  description: string
  content: string
  language: string
  url: string
  tags: string
}

interface ItemFormFieldsProps {
  /** Namespaces the input ids for label association: `create` or `edit`. */
  idPrefix: string
  /** Selects which optional fields render, via `itemFieldVisibility`. */
  typeName: string
  values: ItemFormValues
  /** Called with just the changed key, so callers can keep one state object. */
  onChange: (patch: Partial<ItemFormValues>) => void
  collectionIds: string[]
  onCollectionIdsChange: (ids: string[]) => void
  /** Whether the AI controls (tag suggestions, description generation) are offered (Pro). */
  canUseAi: boolean
  /** True while a create/save is in flight — disables the AI and picker controls. */
  disabled: boolean
  /**
   * The item's file name, for the AI description source. File items have no
   * editable body, so the name is the only detail the model has to work from.
   */
  fileName?: string | null
  /**
   * Upload field, rendered between Description and Language. Only the create
   * dialog passes one — an existing item's file isn't replaceable — which keeps
   * the upload's `UploadKind` and progress plumbing out of this component.
   */
  fileSlot?: ReactNode
  /** Rows for the plain-textarea content fallback; `ContentField` defaults to 8. */
  contentRows?: number
  titlePlaceholder?: string
}

/**
 * Every editable field of an item, in one order, shared by the create dialog
 * and the drawer's edit form. The two rendered the same seven fields with the
 * same props and differed only in their id prefix, the upload slot, and a
 * textarea row count — so they now differ only in those props.
 *
 * Deliberately holds no state and calls no action: each parent owns its own
 * values and its own submit (create vs update, plus the create dialog's
 * separate file-upload path).
 */
export function ItemFormFields({
  idPrefix,
  typeName,
  values,
  onChange,
  collectionIds,
  onCollectionIdsChange,
  canUseAi,
  disabled,
  fileName,
  fileSlot,
  contentRows,
  titlePlaceholder,
}: ItemFormFieldsProps) {
  const show = itemFieldVisibility(typeName)

  return (
    <>
      <FormField label="Title" htmlFor={`${idPrefix}-title`}>
        <Input
          id={`${idPrefix}-title`}
          value={values.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder={titlePlaceholder}
        />
      </FormField>

      <FormField
        label="Description"
        htmlFor={`${idPrefix}-description`}
        action={
          <SuggestDescription
            canUseAi={canUseAi}
            source={{
              typeName,
              title: values.title,
              content: show.content ? values.content : null,
              language: show.language ? values.language : null,
              url: show.url ? values.url : null,
              fileName: fileName ?? null,
            }}
            onGenerated={(description) => onChange({ description })}
            disabled={disabled}
          />
        }
      >
        <Textarea
          id={`${idPrefix}-description`}
          value={values.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={2}
          placeholder="Optional description"
        />
      </FormField>

      {fileSlot}

      {show.language && (
        <LanguageSelect
          id={`${idPrefix}-language`}
          value={values.language}
          onChange={(language) => onChange({ language })}
          disabled={disabled}
        />
      )}

      {show.content && (
        <ContentField
          id={`${idPrefix}-content`}
          typeName={typeName}
          value={values.content}
          onChange={(content) => onChange({ content })}
          language={values.language}
          rows={contentRows}
        />
      )}

      {show.url && (
        <FormField label="URL" htmlFor={`${idPrefix}-url`}>
          <Input
            id={`${idPrefix}-url`}
            type="url"
            value={values.url}
            onChange={(e) => onChange({ url: e.target.value })}
            placeholder="https://example.com"
          />
        </FormField>
      )}

      <FormField label="Tags" htmlFor={`${idPrefix}-tags`}>
        <Input
          id={`${idPrefix}-tags`}
          value={values.tags}
          onChange={(e) => onChange({ tags: e.target.value })}
          placeholder="comma, separated, tags"
        />
        <p className="mt-1 text-xs text-muted-foreground">Separate tags with commas.</p>
        <SuggestTags
          canUseAi={canUseAi}
          title={values.title}
          content={show.content ? values.content : null}
          existingTags={parseTagList(values.tags)}
          onAccept={(tag) => onChange({ tags: appendTag(values.tags, tag) })}
          disabled={disabled}
        />
      </FormField>

      <CollectionsField
        selected={collectionIds}
        onChange={onCollectionIdsChange}
        disabled={disabled}
      />
    </>
  )
}
