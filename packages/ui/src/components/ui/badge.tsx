import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[12px] font-medium leading-4 w-fit whitespace-nowrap shrink-0 gap-1.5 transition-[color,box-shadow]",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-border bg-muted text-muted-foreground",
        destructive:
          "border-[var(--border-danger)] bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]",
        outline: "border-border text-foreground",
        success:
          "border-[var(--border-success)] bg-[var(--status-success-bg)] text-[var(--status-success-fg)]",
        warning:
          "border-[var(--border-warning)] bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]",
        primary:
          "border-[var(--border-brand)] bg-[var(--brand-tint)] text-[var(--brand-primary)]",
        violet:
          "border-[var(--border-violet)] bg-[var(--status-violet-bg)] text-[var(--status-violet-fg)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
