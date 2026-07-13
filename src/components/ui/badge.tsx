import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors duration-200 ease-in-out outline-none has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-danger [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-accentSubtle text-accentOnSurface [a]:hover:bg-accent/20",
        // Reassigned role: property-related figure highlighting, not generic emphasis
        // - see docs/design.md Divergences.
        secondary: "bg-secondarySubtle text-secondaryOnSurface [a]:hover:bg-secondary/20",
        destructive: "bg-dangerSubtle text-danger [a]:hover:bg-danger/20",
        outline: "border-border text-textPrimary [a]:hover:bg-neutralSubtle",
        ghost: "text-textSecondary [a]:hover:bg-neutralSubtle",
        link: "text-accent underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
