import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "emerald" | "slate";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "border border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-600/15 hover:border-blue-700 hover:bg-blue-700",
  secondary:
    "border border-slate-900 bg-slate-900 text-white shadow-sm shadow-slate-900/10 hover:border-slate-950 hover:bg-slate-950",
  danger:
    "border border-red-700 bg-red-700 text-white shadow-sm shadow-red-700/10 hover:border-red-800 hover:bg-red-800",
  ghost:
    "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950",
  emerald:
    "border border-emerald-700 bg-emerald-700 text-white shadow-sm shadow-emerald-700/15 hover:border-emerald-800 hover:bg-emerald-800",
  slate:
    "border border-slate-700 bg-slate-700 text-white shadow-sm shadow-slate-700/15 hover:border-slate-800 hover:bg-slate-800",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-3 text-sm",
  lg: "px-5 py-4 text-base",
};

function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50",
        variantClass[variant],
        sizeClass[size],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
