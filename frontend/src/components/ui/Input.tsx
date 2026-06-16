import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  errorMessage?: string;
  colorScheme?: "blue" | "emerald" | "slate";
}

function Input({
  label,
  errorMessage,
  colorScheme = "blue",
  className = "",
  ...props
}: InputProps) {
  const focusClass =
    colorScheme === "emerald"
      ? "focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      : colorScheme === "slate"
      ? "focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      : "focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <label className="block">
      {label && (
        <span className="mb-2 block text-sm font-semibold text-slate-700">
          {label}
        </span>
      )}

      <input
        className={[
          "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition",
          "placeholder:text-slate-400",
          focusClass,
          "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
          errorMessage ? "border-red-400 focus:border-red-500 focus:ring-red-100" : "",
          className,
        ].join(" ")}
        {...props}
      />

      {errorMessage && (
        <p className="mt-2 text-sm text-red-600">
          {errorMessage}
        </p>
      )}
    </label>
  );
}

export default Input;
