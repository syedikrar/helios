import { clsx } from "clsx";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";

type Variant = "primary" | "ghost" | "danger" | "subtle";

const variants: Record<Variant, string> = {
  primary: "bg-teal-500 text-white hover:bg-teal-600",
  ghost: "border border-navy-100 bg-white text-navy-800 hover:bg-navy-50",
  danger: "border border-red-200 bg-white text-red-600 hover:bg-red-50",
  subtle: "bg-navy-50 text-navy-700 hover:bg-navy-100",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={clsx("h-card", className)}>{children}</div>;
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "w-full rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-navy-700/70">
      {children}
    </label>
  );
}

export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        className ?? "bg-navy-50 text-navy-700",
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-navy-700/60">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-navy-200 border-t-teal-500" />
      {label ?? "Loading…"}
    </div>
  );
}
