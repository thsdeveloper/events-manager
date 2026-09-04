"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { PendingContent, usePendingClick } from "@/components/ui/pending-action"

/**
 * Flat, square, borderless. Every variant is a solid or tinted surface — with
 * borders gone, depth is expressed purely through fill, which is why `outline`
 * is now a neutral surface rather than a stroked one.
 *
 * Colours come from the theme tokens, so the buttons follow whatever brand
 * colour is configured instead of hardcoding one.
 */
const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none border-0 text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        // Was a bordered button; keeps its "secondary action" weight as a muted fill.
        outline:
          "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /**
   * Forces the pending state. Needed for `type="submit"` buttons, where the
   * request is fired by the form's `onSubmit` and the button never sees the
   * promise. Click handlers do not need it — see `autoLoading`.
   */
  loading?: boolean
  /**
   * An `onClick` returning a promise (any `async` handler) holds the button in
   * the pending state until it settles, so API-backed buttons get a spinner
   * without wiring a state flag. Set to `false` to opt a button out.
   */
  autoLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      type = "button",
      loading = false,
      autoLoading = true,
      disabled,
      onClick,
      children,
      ...props
    },
    ref
  ) => {
    const { pending, handleClick } = usePendingClick(onClick, { enabled: autoLoading })
    const isLoading = loading || pending

    // `Slot` forwards to a single child (a link, usually), so there is no room
    // for the overlay — and no request to wait on either.
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          onClick={onClick}
          // Spread rather than a named prop: `SlotProps` does not declare
          // `disabled`, and callers pass it through to anchors today.
          {...{ disabled }}
          {...props}
        >
          {children}
        </Slot>
      )
    }

    return (
      <button
        type={type}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        onClick={handleClick}
        {...props}
      >
        <PendingContent loading={isLoading}>{children}</PendingContent>
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
