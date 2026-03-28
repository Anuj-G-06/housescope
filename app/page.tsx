"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, CheckCircle } from "lucide-react";
import Button from "@/components/ui/Button";

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.25, 0.4, 0.25, 1] },
});

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Spinner() {
  return (
    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
  );
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
    if (ext === "mp4" || ext === "mov") setFile(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile],
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsUploading(true);
    await new Promise((r) => setTimeout(r, 2000));
    setIsUploading(false);
  };

  return (
    <div className="relative min-h-screen bg-base">
      {/* ─── Navbar ─── */}
      <nav className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-3 bg-surface/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-sm bg-primary" />
          <span className="text-text-primary font-bold tracking-tight text-lg">
            HomeScope
          </span>
        </div>
        <div className="flex items-center gap-5">
          <a
            href="#how-it-works"
            className="text-text-secondary text-sm hover:text-text-primary transition-colors duration-150"
          >
            How it works
          </a>
          <Button variant="primary" className="!py-1.5 !px-4 !text-sm !rounded-full">
            Get started
          </Button>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <main className="relative flex flex-col items-center pt-32 pb-20 px-4 max-w-7xl mx-auto">
        {/* Pill badge */}
        <motion.div {...fade(0)}>
          <span className="inline-flex items-center gap-1.5 border border-primary/40 bg-primary-bg text-primary-dark text-xs font-medium rounded-full px-3 py-1">
            🏠 AI-Powered Home Inspection
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...fade(0.1)}
          className="mt-6 text-center text-5xl font-bold leading-tight tracking-tight"
        >
          <span className="text-text-primary">Know exactly what you&rsquo;re buying</span>
          <br />
          <span className="text-text-secondary">before you make an offer.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          {...fade(0.2)}
          className="mt-5 text-center text-lg text-text-secondary max-w-lg mx-auto font-light leading-relaxed"
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
              className="bg-white border border-border text-text-secondary text-xs font-medium rounded-full px-3 py-1 shadow-warm"
            >
              {stat}
            </span>
          ))}
        </motion.div>

        {/* ─── Upload card ─── */}
        <motion.div
          {...fade(0.4)}
          className="mt-12 w-full max-w-xl bg-white border border-border rounded-2xl p-8 shadow-warm-lg"
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
                  ? "border-primary bg-primary-bg"
                  : "border-border hover:border-primary hover:bg-primary-bg/50"
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
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium rounded-full px-3 py-1">
                  <CheckCircle size={14} />
                  {file.name}
                </span>
                <span className="text-text-muted text-sm">
                  {formatFileSize(file.size)}
                </span>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-primary-bg flex items-center justify-center">
                  <Upload size={20} className="text-primary" />
                </div>
                <p className="text-text-primary font-medium text-sm">
                  Drop your walkthrough video here
                </p>
                <p className="text-text-muted text-sm">
                  MP4 or MOV · up to 500 MB
                </p>
                <button
                  type="button"
                  className="text-primary text-sm font-medium hover:text-primary-dark hover:underline transition-colors duration-150"
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
            className="mt-4 w-full bg-white border border-border rounded-xl px-4 py-3 text-text-primary text-sm placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-150"
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
                  ? "bg-primary text-white hover:bg-primary-dark hover:shadow-primary-btn cursor-pointer"
                  : "bg-[#EDE8E1] text-text-muted cursor-not-allowed"
              }
            `}
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
              <CheckCircle size={13} className="text-primary" />
              {item}
            </span>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
