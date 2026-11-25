import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold cursor-pointer select-none transition-[transform,background-color,border-color,box-shadow,color] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.75]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_3px_12px_-3px_rgba(5,150,105,0.45)] hover:bg-primary/92 hover:-translate-y-0.5 hover:shadow-[0_7px_18px_-4px_rgba(5,150,105,0.42)] active:translate-y-0 active:shadow-xs",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_3px_10px_-3px_rgba(220,38,38,0.35)] hover:bg-destructive/92 hover:-translate-y-0.5 active:translate-y-0",
        outline:
          "border border-border bg-card text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-primary/35 hover:bg-accent/55 hover:text-accent-foreground hover:-translate-y-0.5 active:translate-y-0",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:-translate-y-0.5 active:translate-y-0",
        ghost: "hover:bg-accent/60 hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-10 rounded-xl px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
