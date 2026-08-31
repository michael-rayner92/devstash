"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { deleteItem } from "@/actions/items"

interface DeleteItemDialogProps {
  itemId: string
  itemTitle: string
  onDeleted: () => void
}

export function DeleteItemDialog({ itemId, itemTitle, onDeleted }: DeleteItemDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleConfirm() {
    const result = await deleteItem(itemId)
    if (result.success) {
      toast.success("Item deleted")
      setOpen(false)
      onDeleted()
      router.refresh()
    } else {
      toast.error(result.error)
      setOpen(false)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="ghost" className="gap-2 text-destructive hover:text-destructive">
          <Trash2 />
          Delete
        </Button>
      }
      title="Delete item?"
      description={
        <>
          This will permanently delete{" "}
          <span className="font-medium text-foreground">{itemTitle}</span>. This action cannot be
          undone.
        </>
      }
      onConfirm={handleConfirm}
    />
  )
}
