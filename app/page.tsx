"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.25, 0.4, 0.25, 1] },
});

function UploadIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#2C7BE5"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#2C7BE5"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [address, setAddress] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const canSubmit = file && address.trim().length > 0 && !isUploading;

  const handleFile = useCallback((f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext === "mp4" || ext === "mov") {
      setFile(f);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsUploading(true);
    // Pipeline hook goes here — currently simulates upload delay
    await new Promise((r) => setTimeout(r, 2000));
    setIsUploading(false);
  };

  return (
    <div className="relative min-h-screen">
      {/* ─── Navbar ─── */}
      <nav className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-3 backdrop-blur-md bg-black/30 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-sm bg-primary" />
          <span className="text-white font-bold tracking-tight text-lg">
            HomeScope
          </span>
        </div>
        <div className="flex items-center gap-5">
          <a
            href="#how-it-works"
            className="text-text-body text-sm hover:text-white transition-colors"
          >
            How it works
          </a>
          <button className="bg-primary text-white text-sm rounded-full px-4 py-1.5 font-medium hover:bg-primary-hover transition-colors">
            Get started
          </button>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <main className="relative flex flex-col items-center pt-32 pb-20 px-4">
        {/* Pill badge */}
        <motion.div {...fade(0)}>
          <span className="inline-flex items-center gap-1.5 border border-primary/40 bg-primary/10 text-primary text-xs rounded-full px-3 py-1">
            🏠 AI-Powered Home Inspection
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...fade(0.1)}
          className="mt-6 text-center text-5xl font-bold leading-tight tracking-tight"
        >
          <span className="text-white">Know exactly what you&rsquo;re buying</span>
          <br />
          <span className="text-text-body">before you make an offer.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          {...fade(0.2)}
          className="mt-5 text-center text-lg text-text-body max-w-lg mx-auto font-light leading-relaxed"
        >
          Upload your walkthrough video. HomeScope&rsquo;s AI finds every defect,
          maps repair costs, and writes your negotiation letter.
        </motion.p>

        {/* Stats row */}
        <motion.div
          {...fade(0.3)}
          className="mt-6 flex flex-wrap items-center justify-center gap-3"
        >
          {[
            "25% of buyers waive inspections",
            "$14K avg negotiation savings",
            "$3B+ market",
          ].map((stat, i) => (
            <span
              key={i}
              className="bg-white/5 border border-white/[0.08] text-text-body text-xs rounded-full px-3 py-1 font-light"
            >
              {stat}
            </span>
          ))}
        </motion.div>

        {/* ─── Upload card ─── */}
        <motion.div
          {...fade(0.4)}
          className="mt-12 w-full max-w-xl bg-surface border border-border rounded-2xl p-8 glow-primary-lg"
        >
          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`
              flex flex-col items-center justify-center gap-3
              border-2 border-dashed rounded-xl p-10 cursor-pointer
              transition-all duration-200
              ${
                isDragging
                  ? "border-primary/60 bg-primary/5"
                  : "border-border hover:border-primary/60 hover:bg-primary/5"
              }
            `}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".mp4,.mov,video/mp4,video/quicktime"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />

            {file ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm rounded-full px-3 py-1">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {file.name}
                </span>
                <span className="text-text-muted text-sm">
                  {formatFileSize(file.size)}
                </span>
              </div>
            ) : (
              <>
                <UploadIcon />
                <p className="text-white font-medium text-sm">
                  Drop your walkthrough video here
                </p>
                <p className="text-text-muted text-sm">
                  MP4 or MOV · up to 500 MB
                </p>
                <button
                  type="button"
                  className="text-primary text-sm hover:underline"
                >
                  or browse files
                </button>
              </>
            )}
          </div>

          {/* Address input */}
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Property address"
            className="mt-4 w-full bg-card border border-border rounded-xl px-4 py-3 text-white text-sm placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
          />

          {/* Analyze button */}
          <motion.button
            whileHover={canSubmit ? { scale: 1.01 } : {}}
            whileTap={canSubmit ? { scale: 0.99 } : {}}
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`
              mt-4 w-full flex items-center justify-center gap-2
              rounded-xl py-3.5 font-semibold text-sm transition-all duration-200
              ${
                canSubmit
                  ? "bg-primary text-white hover:bg-primary-hover hover:glow-primary-btn cursor-pointer"
                  : "bg-white/5 text-white/20 cursor-not-allowed"
              }
            `}
            style={
              canSubmit
                ? {}
                : undefined
            }
          >
            {isUploading ? (
              <>
                <Spinner />
                Uploading…
              </>
            ) : (
              "Analyze property"
            )}
          </motion.button>
        </motion.div>

        {/* ─── Trust row ─── */}
        <motion.div
          {...fade(0.5)}
          className="mt-8 flex flex-wrap items-center justify-center gap-5"
        >
          {[
            "No account required",
            "Results in under 60 seconds",
            "Professional-grade report",
          ].map((item, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 text-text-muted text-xs"
            >
              <CheckIcon />
              {item}
            </span>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
