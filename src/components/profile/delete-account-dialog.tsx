"use client"

import { useState, useTransition } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { deleteAccount } from "@/actions/profile"

const CONFIRMATION_WORD = "DELETE"

export function DeleteAccountDialog() {
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState("")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleOpenChange(next: boolean) {
    if (!next) setConfirmation("")
    setOpen(next)
  }

  function handleConfirm() {
    setError("")
    startTransition(async () => {
      const result = await deleteAccount()
      if (result?.error) {
        setError(result.error)
        setOpen(false)
      }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <Button variant="destructive">Delete account</Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-xl focus:outline-none">
          <Dialog.Title className="text-base font-semibold">
            Delete account
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            This will permanently delete your account and all your data — items, collections, and tags. This action cannot be undone.
          </Dialog.Description>

          <div className="mt-4 space-y-2">
            <label htmlFor="delete-confirm" className="text-sm text-muted-foreground">
              Type <span className="font-mono font-semibold text-foreground">{CONFIRMATION_WORD}</span> to confirm
            </label>
            <Input
              id="delete-confirm"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={CONFIRMATION_WORD}
              disabled={isPending}
              autoComplete="off"
            />
          </div>

          {error && (
            <p className="mt-3 text-sm text-destructive">{error}</p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button variant="ghost" disabled={isPending}>
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              variant="destructive"
              disabled={isPending || confirmation !== CONFIRMATION_WORD}
              onClick={handleConfirm}
            >
              {isPending ? "Deleting…" : "Yes, delete my account"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
