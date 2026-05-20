"use client"

import { useState, useRef, useEffect } from "react"

/**
 * Tap/click to toggle on touch devices; hover on desktop.
 * Closes when tapping/clicking outside.
 */
export function InfoTooltip({
  content,
  direction = "up",
}: {
  content:    string
  direction?: "up" | "down"
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside tap/click
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handle)
    document.addEventListener("touchstart", handle)
    return () => {
      document.removeEventListener("mousedown", handle)
      document.removeEventListener("touchstart", handle)
    }
  }, [open])

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-zinc-500 hover:text-zinc-300 cursor-help text-xs leading-none select-none p-1 -m-1"
        aria-label="More information"
      >
        ⓘ
      </button>
      {open && (
        <div
          className={[
            "absolute z-30 w-64 max-w-[calc(100vw-3rem)] rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-xs text-zinc-300 leading-relaxed shadow-xl pointer-events-none",
            direction === "up"   ? "bottom-full left-0 mb-2" : "top-full left-0 mt-2",
          ].join(" ")}
        >
          {content}
        </div>
      )}
    </div>
  )
}
