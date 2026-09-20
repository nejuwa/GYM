"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Link2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

interface ProfileImageUploaderProps {
  url: string;
  file: File | null;
  onUrlChange: (url: string) => void;
  onFileChange: (file: File | null) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  label?: string;
}

export function ProfileImageUploader({
  url,
  file,
  onUrlChange,
  onFileChange,
  onError,
  disabled = false,
  label = "Profile image",
}: ProfileImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [mode, setMode] = useState<"file" | "url">(file ? "file" : "url");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const clearObjectUrl = () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
  };

  const selectFile = (nextFile: File | null) => {
    if (!nextFile) return;
    if (!ACCEPTED_TYPES.has(nextFile.type)) {
      onError?.("Please choose a JPEG, PNG, or WEBP image.");
      return;
    }
    if (nextFile.size > MAX_FILE_SIZE) {
      onError?.("Image files must be 5 MB or smaller.");
      return;
    }
    clearObjectUrl();
    const nextPreviewUrl = URL.createObjectURL(nextFile);
    objectUrlRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
    setMode("file");
    onUrlChange("");
    onFileChange(nextFile);
  };

  const removeImage = () => {
    clearObjectUrl();
    setPreviewUrl(null);
    onFileChange(null);
    onUrlChange("");
    if (inputRef.current) inputRef.current.value = "";
  };

  useEffect(() => () => clearObjectUrl(), []);

  const preview = previewUrl ?? (!file && url ? url : null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        {preview && (
          <Button type="button" size="xs" variant="ghost" onClick={removeImage} disabled={disabled}>
            <X className="h-3.5 w-3.5" /> Remove
          </Button>
        )}
      </div>

      <div className="flex rounded-lg border border-border bg-slate-50 p-1">
        <button type="button" onClick={() => setMode("file")} disabled={disabled} className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${mode === "file" ? "bg-white text-primary shadow-sm" : "text-slate-500"}`}>
          <UploadCloud className="h-4 w-4" /> Upload File
        </button>
        <button type="button" onClick={() => setMode("url")} disabled={disabled} className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${mode === "url" ? "bg-white text-primary shadow-sm" : "text-slate-500"}`}>
          <Link2 className="h-4 w-4" /> Image URL
        </button>
      </div>

      {mode === "file" ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            selectFile(event.dataTransfer.files[0] ?? null);
          }}
          className={`rounded-xl border-2 border-dashed p-4 text-center transition-colors ${dragActive ? "border-primary bg-primary-light" : "border-border bg-white"}`}
        >
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => selectFile(event.target.files?.[0] ?? null)} disabled={disabled} />
          {preview ? (
            <div className="flex items-center justify-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Selected profile preview" className="h-20 w-20 rounded-full object-cover ring-2 ring-border" />
              <div className="text-left">
                <p className="text-sm font-medium text-slate-700">{file?.name ?? "Current image"}</p>
                <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={disabled}>
                  <ImagePlus className="h-4 w-4" /> Change image
                </Button>
              </div>
            </div>
          ) : (
            <>
              <UploadCloud className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-2 text-sm text-slate-600">Drag and drop an image here</p>
              <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => inputRef.current?.click()} disabled={disabled}>Browse Files</Button>
              <p className="mt-2 text-xs text-slate-500">JPEG, PNG, or WEBP up to 5 MB</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="url"
            value={url ?? ""}
            onChange={(event) => {
              clearObjectUrl();
              setPreviewUrl(null);
              onFileChange(null);
              onUrlChange(event.target.value);
            }}
            placeholder="https://example.com/profile.jpg"
            disabled={disabled}
            className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Profile URL preview" className="h-20 w-20 rounded-full object-cover ring-2 ring-border" />
          )}
        </div>
      )}
    </div>
  );
}
