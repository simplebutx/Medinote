import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  errorMessage?: string;
}

function Input({
  label,
  errorMessage,
  className = "",
  ...props
}: InputProps) {
  return (
    <label className="block">
      {label && (
        <span className="mb-2 block text-sm font-medium text-slate-700">
          {label}
        </span>
      )}

      <input
        className={[
          "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition",
          "placeholder:text-slate-400",
          "focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
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