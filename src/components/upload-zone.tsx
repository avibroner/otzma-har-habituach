"use client";

import { useCallback, useRef, useState } from "react";

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export default function UploadZone({ onFileSelected, disabled }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (disabled) return;
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ];
      if (!validTypes.includes(file.type) && !file.name.match(/\.xlsx?$/i)) {
        alert("יש להעלות קובץ Excel בלבד (.xlsx / .xls)");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert("הקובץ גדול מדי (מקסימום 5MB)");
        return;
      }
      onFileSelected(file);
    },
    [onFileSelected, disabled]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`
        relative cursor-pointer rounded-2xl border-2 border-dashed p-10
        transition-all duration-200 text-center backdrop-blur-xl
        ${isDragging
          ? "border-[#d8b368] bg-white/15 scale-[1.01] shadow-lg shadow-[#d8b368]/10"
          : "border-white/20 bg-white/10 hover:border-white/40 hover:bg-white/15 hover:shadow-lg"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleFile(e.target.files[0]);
        }}
      />

      <div className="flex flex-col items-center gap-3">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
          isDragging ? "bg-[#d8b368]/20" : "bg-white/10"
        }`}>
          <svg
            className={`w-8 h-8 transition-colors ${isDragging ? "text-[#d8b368]" : "text-white/60"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>
        <div>
          <p className="text-base font-semibold text-white">
            {isDragging ? "שחרר כאן" : "גרור קובץ Excel לכאן"}
          </p>
          <p className="mt-1 text-sm text-white/40">
            או לחץ לבחירת קובץ
          </p>
        </div>
        <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full">
          <svg className="w-3.5 h-3.5 text-[#d8b368]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14.447 3.027a.75.75 0 01.527.92l-4.5 16.5a.75.75 0 01-1.448-.394l4.5-16.5a.75.75 0 01.921-.526zM16.72 6.22a.75.75 0 011.06 0l5.25 5.25a.75.75 0 010 1.06l-5.25 5.25a.75.75 0 11-1.06-1.06L21.44 12l-4.72-4.72a.75.75 0 010-1.06zm-9.44 0a.75.75 0 010 1.06L2.56 12l4.72 4.72a.75.75 0 11-1.06 1.06L.97 12.53a.75.75 0 010-1.06l5.25-5.25a.75.75 0 011.06 0z" />
          </svg>
          <span className="text-xs text-white/50">.xlsx / .xls</span>
        </div>
      </div>
    </div>
  );
}
