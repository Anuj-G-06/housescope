"use client";

interface VideoPreviewProps {
  file: File;
  onRemove: () => void;
}

export function VideoPreview({ file, onRemove }: VideoPreviewProps) {
  const url = URL.createObjectURL(file);

  return (
    <div className="relative rounded-lg overflow-hidden border border-border">
      <video
        src={url}
        controls
        className="w-full max-h-[300px] object-contain bg-black"
        onLoad={() => URL.revokeObjectURL(url)}
      />
      <div className="flex items-center justify-between p-3 bg-muted/50">
        <div className="text-sm">
          <span className="font-medium">{file.name}</span>
          <span className="ml-2 text-muted-foreground">
            ({(file.size / 1024 / 1024).toFixed(1)} MB)
          </span>
        </div>
        <button
          onClick={onRemove}
          className="text-sm text-destructive hover:underline"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
