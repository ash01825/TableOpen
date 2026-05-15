import { type InputHTMLAttributes, useId } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({
  label,
  error,
  className = "",
  id,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs text-text-secondary font-medium"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={[
          "h-11 px-3 text-sm rounded-[var(--radius-md)]",
          "bg-surface-1 text-text-primary",
          "border border-border",
          "placeholder:text-text-muted placeholder:font-normal",
          "transition-colors duration-150",
          "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent focus-visible:border-accent",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          error ? "border-danger" : "hover:border-border-strong",
          className,
        ].join(" ")}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
