"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { deleteCollection } from "@/actions/collections"

interface CollectionDeleteDialogProps {
  collection: { id: string; name: string }
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Called after a successful delete. When omitted, the dialog falls back to
   * `router.refresh()` (drops the card from a grid). The detail page passes a
   * callback that navigates away instead, since the page itself is gone.
   */
  onDeleted?: () => void
}

export function CollectionDeleteDialog({
  collection,
  open,
  onOpenChange,
  onDeleted,
}: CollectionDeleteDialogProps) {
  const router = useRouter()

  async function handleConfirm() {
    const result = await deleteCollection(collection.id)
    if (result.success) {
      toast.success("Collection deleted")
      onOpenChange(false)
      if (onDeleted) {
        onDeleted()
      } else {
        router.refresh()
      }
    } else {
      toast.error(result.error)
      onOpenChange(false)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete collection?"
      description={
        <>
          This will delete{" "}
          <span className="font-medium text-foreground">{collection.name}</span>. The items in it
          won&apos;t be deleted — they just won&apos;t belong to this collection anymore.
        </>
      }
      onConfirm={handleConfirm}
    />
  )
}
