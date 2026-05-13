"use client";

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  const toggle = () => {
    if (disabled) return;
    onChange(!checked);
  };

  return (
    <div
      className={`flex items-center gap-3 text-sm ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={toggle}
        className={`relative h-6 w-11 rounded-full transition-colors shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper ${
          checked ? "bg-ink" : "bg-rule"
        } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          aria-hidden
          style={{
            transform: `translateX(${checked ? 22 : 2}px)`,
          }}
          className="absolute top-0.5 left-0 h-5 w-5 rounded-full bg-paper shadow-[0_1px_2px_rgba(0,0,0,0.25)] transition-transform duration-150"
        />
      </button>
      {label && (
        <span
          onClick={toggle}
          className={`text-ink-muted select-none ${
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
}
