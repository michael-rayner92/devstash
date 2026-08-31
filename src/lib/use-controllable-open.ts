"use client"

import { useState } from "react"

interface ControllableOpen {
  open: boolean
  /** Sets the open state, then runs `onClose` when closing. */
  setOpen: (open: boolean) => void
}

/**
 * Open state for a dialog that can be driven either by its own trigger or by a
 * parent. Passing `controlledOpen` hands control to the caller; omitting it
 * keeps the state internal.
 *
 * Both create dialogs need this: they render a trigger of their own on some
 * surfaces, while the dashboard header lifts their state so the desktop buttons
 * and the mobile "+" menu drive one shared instance.
 *
 * `onClose` is where a form resets — it runs on every close, from either path.
 */
export function useControllableOpen(
  controlledOpen: boolean | undefined,
  onOpenChange: ((open: boolean) => void) | undefined,
  onClose?: () => void
): ControllableOpen {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen

  function setOpen(next: boolean) {
    if (isControlled) onOpenChange?.(next)
    else setInternalOpen(next)
    if (!next) onClose?.()
  }

  return { open, setOpen }
}
