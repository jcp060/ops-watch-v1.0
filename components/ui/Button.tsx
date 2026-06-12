import { type ButtonHTMLAttributes } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "ghost";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-cyan-500/30 bg-cyan-600/20 text-cyan-100 hover:border-cyan-400/50 hover:bg-cyan-600/30 hover:shadow-[0_0_20px_rgba(34,211,238,0.12)]",
  secondary:
    "border-slate-600/50 bg-slate-800/60 text-slate-100 hover:border-slate-500/60 hover:bg-slate-700/60",
  success:
    "border-emerald-600/30 bg-emerald-950/40 text-emerald-200 hover:border-emerald-500/40 hover:bg-emerald-950/60",
  danger:
    "border-rose-600/40 bg-rose-950/40 text-rose-200 hover:border-rose-500/50 hover:bg-rose-950/60 hover:shadow-[0_0_20px_rgba(244,63,94,0.1)]",
  ghost:
    "border-transparent bg-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

export function Button({
  variant = "secondary",
  fullWidth = false,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-40 ${variantClasses[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    />
  );
}
