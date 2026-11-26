import * as React from "react";
import { cn } from "../../utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-[8px] border border-input bg-card px-3 py-1 text-base text-foreground shadow-2xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 sm:h-9 sm:text-[13px]",
        className
      )}
      {...props}
    />
  );
}

export { Input };
