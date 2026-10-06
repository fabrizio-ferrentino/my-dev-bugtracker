import * as React from "react";
import { cn } from "@/lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

function Label({ className, ...props }: LabelProps) {
  return (
    // eslint-disable-next-line jsx-a11y/label-has-associated-control
    <label
      className={cn("text-sm font-medium leading-none", className)}
      {...props}
    />
  );
}

export { Label };
