import type { HTMLAttributes, ReactNode } from "react";

type BadgeVariant = "blue" | "green" | "yellow" | "red" | "gray";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: BadgeVariant;
}

const variantClass: Record<BadgeVariant, string> = {
  blue: "bg-blue-50 text-blue-700",
  green: "bg-emerald-50 text-emerald-700",
  yellow: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  gray: "bg-slate-100 text-slate-700",
};

function Badge({
  children,
  variant = "gray",
  className = "",
  ...props
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        variantClass[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;