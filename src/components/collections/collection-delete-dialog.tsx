"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"
import { deleteCollection } from "@/actions/collections"
import { cn } from "@/lib/utils"

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
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
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
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete collection?</AlertDialogTitle>
          <AlertDialogDescription>
            This will delete{" "}
            <span className="font-medium text-foreground">{collection.name}</span>. The items in it
            won&apos;t be deleted — they just won&apos;t belong to this collection anymore.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: "destructive" }), "hover:bg-destructive/90")}
            disabled={isPending}
            onClick={(e) => {
              // Keep the dialog open until the action resolves; close it ourselves.
              e.preventDefault()
              handleConfirm()
            }}
          >
            {isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
