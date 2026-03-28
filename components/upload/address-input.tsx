"use client";

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function AddressInput({ value, onChange }: AddressInputProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor="address"
        className="text-sm font-medium text-[var(--color-text-primary)]"
      >
        Property Address
      </label>
      <input
        id="address"
        className="w-full px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
        placeholder="123 Main St, Pittsburgh, PA 15201"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
