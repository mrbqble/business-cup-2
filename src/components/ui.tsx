import type { ComponentProps, ReactNode } from "react";

export function Card({ className = "", ...props }: ComponentProps<"section">) {
  return <section className={`paper rounded-card p-4 sm:p-5 ${className}`} {...props} />;
}

type ButtonVariant = "primary" | "secondary" | "danger";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-text hover:opacity-90",
  secondary: "paper border border-border text-text hover:brightness-95",
  danger: "bg-danger text-white hover:opacity-90",
};

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-card px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_STYLES[variant]} ${className}`}
      {...props}
    />
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 opacity-80">
      <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent" />
      {label}
    </span>
  );
}

export function ErrorState({ message, onRetry, children }: { message: string; onRetry?: () => void; children?: ReactNode }) {
  return (
    <Card role="alert" className="border-danger bg-danger-surface">
      <p className="text-sm">{message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        )}
        {children}
      </div>
    </Card>
  );
}
