import clsx from "clsx";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from "react";

export type ButtonVariant = "primary" | "ghost" | "soft" | "danger";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const variantClass: Record<ButtonVariant, string> = {
    primary: "bg-gradient-to-br from-moss-700 to-moss-800 text-white hover:from-moss-800 hover:to-moss-900",
    ghost: "bg-transparent text-moss-800 hover:bg-moss-100/80",
    soft: "bg-sand-200 text-moss-900 hover:bg-sand-300",
    danger: "bg-red-600 text-white hover:bg-red-700"
  };

  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-xl border border-transparent px-4 py-2 text-sm font-medium transition duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-300 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50",
        variantClass[variant],
        className
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  children
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={clsx(
        "forest-shell rounded-3xl border border-moss-100/90 bg-white/92 p-4 shadow-soft sm:p-5",
        className
      )}
    >
      {children}
    </section>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "w-full rounded-xl border border-moss-200 bg-white/95 px-3 py-2.5 text-sm text-moss-900 outline-none transition",
        "placeholder:text-moss-400 focus:border-moss-500 focus:ring-2 focus:ring-moss-200",
        className
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx(
        "w-full rounded-xl border border-moss-200 bg-white/95 px-3 py-2.5 text-sm text-moss-900 outline-none transition",
        "focus:border-moss-500 focus:ring-2 focus:ring-moss-200",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        "w-full rounded-xl border border-moss-200 bg-white/95 px-3 py-2.5 text-sm text-moss-900 outline-none transition",
        "placeholder:text-moss-400 focus:border-moss-500 focus:ring-2 focus:ring-moss-200",
        className
      )}
      {...props}
    />
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full bg-moss-100 px-2.5 py-1 text-xs font-medium text-moss-700",
        className
      )}
    >
      {children}
    </span>
  );
}
