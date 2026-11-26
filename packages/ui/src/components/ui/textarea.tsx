import * as React from "react";
import { cn } from "../../utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-16 w-full rounded-[8px] border border-input bg-card px-3 py-2 text-base text-foreground shadow-2xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 sm:text-[13px]",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
