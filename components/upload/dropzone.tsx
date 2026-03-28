"use client";

import { useCallback, useState } from "react";
import { Card } from "@/components/ui/card";

interface DropzoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function Dropzone({ onFileSelect, disabled }: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.type === "video/mp4" || file.type === "video/quicktime")) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  return (
    <Card
      className={`relative flex flex-col items-center justify-center border-2 border-dashed p-12 text-center transition-colors cursor-pointer ${
        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => document.getElementById("video-input")?.click()}
    >
      <div className="mb-4 text-5xl">&#127968;</div>
      <p className="text-lg font-medium">Drop your walkthrough video here</p>
      <p className="mt-1 text-sm text-muted-foreground">MP4 or MOV, up to 3 minutes</p>
      <input
        id="video-input"
        type="file"
        accept="video/mp4,video/quicktime"
        className="hidden"
        onChange={handleFileInput}
      />
    </Card>
  );
}
