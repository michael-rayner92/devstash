"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormField } from "@/components/items/form-field"
import { createCollection } from "@/actions/collections"
import { useControllableOpen } from "@/lib/use-controllable-open"

const EMPTY_FORM = {
  name: "",
  description: "",
}

interface CollectionCreateDialogProps {
  /** Optional trigger element. Omit when driving the dialog via `open`/`onOpenChange`. */
  trigger?: ReactNode
  /** Controlled open state. When provided, the dialog is driven externally. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CollectionCreateDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
}: CollectionCreateDialogProps) {
  const router = useRouter()
  const [form, setForm] = useState(EMPTY_FORM)
  const [creating, setCreating] = useState(false)

  const canCreate = form.name.trim().length > 0 && !creating

  // Discard the form on close, whichever path closed it.
  const { open, setOpen: handleOpenChange } = useControllableOpen(
    controlledOpen,
    onOpenChange,
    () => setForm(EMPTY_FORM)
  )

  async function handleCreate() {
    setCreating(true)
    const result = await createCollection({
      name: form.name,
      description: form.description,
    })
    setCreating(false)

    if (result.success) {
      toast.success("Collection created")
      handleOpenChange(false)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New collection</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label="Name" htmlFor="create-collection-name">
            <Input
              id="create-collection-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Collection name"
            />
          </FormField>

          <FormField label="Description" htmlFor="create-collection-description">
            <Textarea
              id="create-collection-description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Optional description"
            />
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!canCreate}>
            {creating ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
