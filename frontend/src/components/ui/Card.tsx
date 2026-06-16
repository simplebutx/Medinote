import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={[
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
