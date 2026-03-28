"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function AddressInput({ value, onChange }: AddressInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="address">Property Address</Label>
      <Input
        id="address"
        placeholder="123 Main St, Pittsburgh, PA 15201"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
