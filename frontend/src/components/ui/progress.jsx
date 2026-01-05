import * as React from "react"

import { cn } from "@/lib/utils"

// Custom Progress component without Radix UI to avoid ResizeObserver issues
const Progress = React.forwardRef(({ className, value, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
      className
    )}
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={value || 0}
    {...props}>
    <div
      className="h-full bg-primary transition-all duration-200 ease-out"
      style={{ width: `${Math.min(100, Math.max(0, value || 0))}%` }} 
    />
  </div>
))
Progress.displayName = "Progress"

export { Progress }
