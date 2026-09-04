"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

function isPromise(value: unknown): value is Promise<unknown> {
  return typeof (value as Promise<unknown> | undefined)?.then === "function"
}

interface PendingClickOptions {
  /** Set to false to opt a control out of the automatic pending state. */
  enabled?: boolean
  /**
   * Radix' `AlertDialog.Action` and `Dialog.Close` dismiss on click, which would
   * unmount the control before the request settles — the spinner would never be
   * seen and the user would get no feedback. Cancelling the default keeps the
   * dialog open until the handler itself closes it.
   */
  keepMounted?: boolean
}

/**
 * Wraps a click handler so that an `async` one — anything returning a promise —
 * holds the control in a pending state until the request settles. This is what
 * lets API-backed buttons show a spinner without wiring up a state flag.
 */
export function usePendingClick<E extends React.MouseEvent<HTMLElement>>(
  onClick: ((event: E) => unknown) | undefined,
  { enabled = true, keepMounted = false }: PendingClickOptions = {}
) {
  const [pending, setPending] = React.useState(false)

  // A resolved request often unmounts the control (dialog closes, row is
  // removed, route changes). Dropping the update avoids setting state on a dead
  // component.
  const mounted = React.useRef(true)
  React.useEffect(() => {
    mounted.current = true

    return () => {
      mounted.current = false
    }
  }, [])

  const handleClick = React.useCallback(
    (event: E) => {
      const result = onClick?.(event)
      if (!enabled || !isPromise(result)) return

      if (keepMounted) event.preventDefault()
      setPending(true)

      // Settled either way clears the pending state. Handling the rejection here
      // also keeps a throwing handler from surfacing as an unhandled rejection —
      // reporting the failure stays the handler's job (httpClient toasts it).
      const settle = () => {
        if (mounted.current) setPending(false)
      }
      result.then(settle).catch(settle)
    },
    [enabled, keepMounted, onClick]
  )

  return { pending, handleClick }
}

/**
 * Centred spinner over the label. The label is hidden rather than unmounted so
 * the control keeps its size and the layout does not jump mid-request.
 *
 * Requires a positioned ancestor — every control using it carries `relative`.
 *
 * The label wrapper is `display: contents`: it must not create a box of its
 * own, otherwise the children stop taking part in the control's flex row and
 * `w-full justify-between` triggers (comboboxes, date pickers) lose their
 * trailing icon alignment. `visibility` is inherited, so hiding still works.
 */
export function PendingContent({
  loading,
  spinnerClassName,
  children,
}: {
  loading: boolean
  spinnerClassName?: string
  children: React.ReactNode
}) {
  return (
    <>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2 aria-hidden="true" className={cn("size-4 animate-spin", spinnerClassName)} />
        </span>
      )}
      <span className={cn("contents", loading && "invisible")}>{children}</span>
    </>
  )
}
