"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { uploadAircraftImageToStorage } from "@/lib/aircraft-image";

const PLACEHOLDER_SRC = "/aircraft-placeholder.svg";

interface AircraftImageUploadProps {
  aircraftId: string;
  imageUrl?: string;
  onImageChange: (url: string | undefined) => void;
  compact?: boolean;
}

export function AircraftImageUpload({
  aircraftId,
  imageUrl,
  onImageChange,
  compact = false,
}: AircraftImageUploadProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageHint, setStorageHint] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/aircraft/storage-status")
      .then((r) => r.json())
      .then((data: { configured?: boolean }) => {
        if (!data.configured) {
          setStorageHint(
            "Supabase not configured — images save locally in this browser until you add .env.local keys."
          );
        }
      })
      .catch(() => {});
  }, []);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const result = await uploadAircraftImageToStorage(file, aircraftId);
      onImageChange(result.url);
      if (result.storage === "local") {
        setStorageHint(
          "Saved locally (browser storage). Add Supabase env vars for cloud image hosting."
        );
      } else {
        setStorageHint(null);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Image upload failed.";
      setError(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const frameClass = compact
    ? "h-16 w-24"
    : "h-28 w-full max-w-[10rem] sm:h-32 sm:max-w-[11rem]";

  return (
    <div className={compact ? "shrink-0" : "w-full sm:max-w-[11rem]"}>
      <div
        className={`relative flex ${frameClass} items-center justify-center overflow-hidden rounded-lg border border-slate-800/60 bg-slate-900/50`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl || PLACEHOLDER_SRC}
          alt=""
          className={`h-full w-full object-cover ${imageUrl ? "opacity-95" : "opacity-40"}`}
        />
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70">
            <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-300/90">
              Uploading…
            </span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          void handleFile(file);
        }}
      />

      <div className={`mt-2 flex flex-wrap gap-2 ${compact ? "flex-col" : ""}`}>
        <Button
          type="button"
          variant="secondary"
          className="!px-3 !py-1.5 text-xs"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {imageUrl ? "Change Image" : "Upload Image"}
        </Button>
        {imageUrl && (
          <Button
            type="button"
            variant="ghost"
            className="!px-3 !py-1.5 text-xs"
            disabled={uploading}
            onClick={() => {
              setError(null);
              onImageChange(undefined);
            }}
          >
            Remove
          </Button>
        )}
      </div>

      {error && (
        <p className="mt-2 text-xs text-rose-400" role="alert">
          {error}
        </p>
      )}
      {storageHint && !error && (
        <p className="mt-2 text-xs text-amber-400/90">{storageHint}</p>
      )}
      {!compact && (
        <p className="mt-1 text-[10px] text-slate-500">
          JPG, PNG, or WebP · max 5 MB
        </p>
      )}
    </div>
  );
}
