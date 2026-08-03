"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { CHAOS_SOURCES } from "./icons"

const ICON = 52
const REPEL_RADIUS = 90
const MAX_SPEED = 1.6
/**
 * Inset the travel area so the rotate + scale-pulse transform can't push a node
 * past the container's `overflow: hidden` edge (which rendered as a half-drawn
 * icon). A 52x68 node rotated ~13deg and scaled 1.06 grows ~7px per side.
 */
const PAD = 8

interface PhysicsNode {
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  va: number
  phase: number
}

/**
 * The hero's "chaos" box: floating developer-knowledge icons that drift, bounce
 * off the walls, gently rotate/pulse, and repel from the pointer. Ported from
 * the prototype's requestAnimationFrame loop. Respects prefers-reduced-motion
 * (static placement, no loop) and cleans up on unmount.
 */
export function ChaosAnimation() {
  const containerRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const els = nodeRefs.current.filter((el): el is HTMLDivElement => el !== null)
    if (els.length === 0) return

    const nodes: PhysicsNode[] = els.map(() => ({
      x: 0,
      y: 0,
      vx: (Math.random() * 2 - 1) * 0.5,
      vy: (Math.random() * 2 - 1) * 0.5,
      angle: Math.random() * 360,
      va: (Math.random() * 2 - 1) * 0.4,
      phase: Math.random() * Math.PI * 2,
    }))

    // Container geometry can change on resize; keep it fresh.
    let bounds = container.getBoundingClientRect()
    const measure = () => {
      bounds = container.getBoundingClientRect()
    }
    window.addEventListener("resize", measure, { passive: true })

    // Nodes are taller than they are wide (icon + label), and the ones hidden
    // below `sm` measure 0 — so fall back to the known design size rather than
    // letting a 0 collapse the clamp range.
    const sizeOf = (el: HTMLDivElement) => ({
      w: el.offsetWidth || ICON,
      h: el.offsetHeight || ICON,
    })
    const maxX = (i: number, w: number) =>
      Math.max(PAD, w - sizeOf(els[i]).w - PAD)
    const maxY = (i: number, h: number) =>
      Math.max(PAD, h - sizeOf(els[i]).h - PAD)

    // Seed positions spread across the box in a 4-column grid.
    const cols = 4
    const cw = bounds.width || 300
    const ch = bounds.height || 320
    const rows = Math.max(1, Math.ceil(els.length / cols))
    nodes.forEach((n, i) => {
      const spanX = maxX(i, cw) - PAD
      const spanY = maxY(i, ch) - PAD
      n.x = PAD + ((i % cols) / (cols - 1 || 1)) * spanX
      n.y = PAD + (Math.floor(i / cols) / (rows - 1 || 1)) * spanY
    })

    // Pointer repel — track pointer in container-local coordinates.
    const mouse = { x: -999, y: -999, active: false }
    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX - bounds.left
      mouse.y = e.clientY - bounds.top
      mouse.active = true
    }
    const onLeave = () => {
      mouse.active = false
    }
    container.addEventListener("pointermove", onMove)
    container.addEventListener("pointerleave", onLeave)

    const cleanup = () => {
      window.removeEventListener("resize", measure)
      container.removeEventListener("pointermove", onMove)
      container.removeEventListener("pointerleave", onLeave)
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) {
      nodes.forEach((n, i) => {
        els[i].style.transform = `translate(${n.x}px, ${n.y}px)`
      })
      return cleanup
    }

    let raf = 0
    const tick = () => {
      const w = bounds.width || 300
      const h = bounds.height || 320
      const t = performance.now() / 1000

      nodes.forEach((n, i) => {
        if (mouse.active) {
          const cx = n.x + ICON / 2
          const cy = n.y + ICON / 2
          const dx = cx - mouse.x
          const dy = cy - mouse.y
          const dist = Math.hypot(dx, dy) || 0.001
          if (dist < REPEL_RADIUS) {
            const force = (1 - dist / REPEL_RADIUS) * 0.9
            n.vx += (dx / dist) * force
            n.vy += (dy / dist) * force
          }
        }

        // Gentle drift so they never fully settle.
        n.vx += (Math.random() - 0.5) * 0.04
        n.vy += (Math.random() - 0.5) * 0.04

        // Clamp speed.
        const speed = Math.hypot(n.vx, n.vy)
        if (speed > MAX_SPEED) {
          n.vx = (n.vx / speed) * MAX_SPEED
          n.vy = (n.vy / speed) * MAX_SPEED
        }

        n.x += n.vx
        n.y += n.vy

        // Bounce off walls, measured per node and inset by PAD so the rotate /
        // scale transform stays inside the clipped container.
        const right = maxX(i, w)
        const bottom = maxY(i, h)
        if (n.x <= PAD) {
          n.x = PAD
          n.vx = Math.abs(n.vx)
        } else if (n.x >= right) {
          n.x = right
          n.vx = -Math.abs(n.vx)
        }
        if (n.y <= PAD) {
          n.y = PAD
          n.vy = Math.abs(n.vy)
        } else if (n.y >= bottom) {
          n.y = bottom
          n.vy = -Math.abs(n.vy)
        }

        // Friction.
        n.vx *= 0.99
        n.vy *= 0.99

        // Rotation + scale pulse.
        n.angle += n.va
        const scale = 1 + Math.sin(t * 1.5 + n.phase) * 0.06
        const rot = Math.sin(t * 0.8 + n.phase) * 8 + n.angle * 0.05

        els[i].style.transform = `translate(${n.x}px, ${n.y}px) rotate(${rot}deg) scale(${scale})`
      })

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      cleanup()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="relative h-80 overflow-hidden rounded-[20px] border border-dashed border-(--home-border) bg-(--home-bg-elev) bg-[radial-gradient(circle_at_50%_50%,rgba(239,68,68,0.05),transparent_70%)]"
    >
      {CHAOS_SOURCES.map((src, i) => {
        const Icon = src.Icon
        return (
          <div
            key={src.label}
            ref={(el) => {
              nodeRefs.current[i] = el
            }}
            className={cn(
              "absolute left-0 top-0 h-auto min-h-[52px] w-[52px] place-items-center rounded-xl border border-(--home-border) bg-(--home-bg-card) text-(--home-text-dim) shadow-[0_6px_18px_rgba(0,0,0,0.4)] will-change-transform",
              // Below sm the box is only ~327x320, where 8 nodes stack and the
              // labels become unreadable — thin the set out to 5.
              i >= 5 ? "hidden sm:grid" : "grid"
            )}
          >
            <Icon />
            <span className="text-[0.62rem] font-semibold">{src.label}</span>
          </div>
        )
      })}
    </div>
  )
}
