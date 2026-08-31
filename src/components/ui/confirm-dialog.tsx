"use client"

import type { ReactNode } from "react"
import { useTransition } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Optional trigger. Omit when the dialog is opened from elsewhere (e.g. a menu item). */
  trigger?: ReactNode
  title: string
  description: ReactNode
  confirmLabel?: string
  pendingLabel?: string
  /**
   * Runs inside a transition, which drives the pending state. It does **not**
   * close the dialog — the caller does that itself, so it stays in control of
   * the order in which the toast, the close, and any post-delete navigation or
   * refresh happen (the item drawer, for one, needs its alert dialog closed
   * before the drawer that contains its trigger unmounts).
   */
  onConfirm: () => Promise<void>
}

/**
 * Destructive confirmation. The item and collection delete dialogs were the
 * same shell down to the `e.preventDefault()` trick that keeps the dialog open
 * until the action resolves.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  confirmLabel = "Delete",
  pendingLabel = "Deleting…",
  onConfirm,
}: ConfirmDialogProps) {
  const [isPending, startTransition] = useTransition()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: "destructive" }), "hover:bg-destructive/90")}
            disabled={isPending}
            onClick={(e) => {
              // Keep the dialog open until the action resolves; the caller closes it.
              e.preventDefault()
              startTransition(async () => {
                await onConfirm()
              })
            }}
          >
            {isPending ? pendingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
