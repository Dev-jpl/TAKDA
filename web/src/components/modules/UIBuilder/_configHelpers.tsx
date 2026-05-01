"use client";

import React, { useEffect, useRef, useState } from 'react';

export function DebouncedInput({
  value, onChange, placeholder, multiline = false, delay = 150,
}: {
  value:        string;
  onChange:     (v: string) => void;
  placeholder?: string;
  multiline?:   boolean;
  delay?:       number;
}) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocal(value); }, [value]);

  const handleChange = (v: string) => {
    setLocal(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(v), delay);
  };

  const cls = 'w-full bg-background-primary border border-border-primary rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-modules-aly/50 transition-all placeholder:text-text-tertiary resize-none';

  return multiline ? (
    <textarea className={cls} rows={2} value={local} placeholder={placeholder} onChange={e => handleChange(e.target.value)} />
  ) : (
    <input type="text" className={cls} value={local} placeholder={placeholder} onChange={e => handleChange(e.target.value)} />
  );
}

export function Toggle({ checked, onChange, brandColor }: { checked: boolean; onChange: (v: boolean) => void; brandColor: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? '' : 'bg-background-tertiary border border-border-primary'
      }`}
      style={checked ? { backgroundColor: brandColor } : undefined}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">{children}</p>;
}

export function Section({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>;
}
