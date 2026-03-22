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
        relative cursor-pointer rounded-2xl border-2 border-dashed p-12
        transition-all duration-200 text-center
        ${isDragging
          ? "border-blue-500 bg-blue-50 scale-[1.02]"
          : "border-gray-300 bg-white hover:border-blue-400 hover:bg-gray-50"
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

      <div className="flex flex-col items-center gap-4">
        <div className="text-5xl">
          {isDragging ? "📥" : "📄"}
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-700">
            {isDragging ? "שחרר כאן" : "גרור קובץ Excel לכאן"}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            או לחץ לבחירת קובץ (.xlsx)
          </p>
        </div>
      </div>
    </div>
  );
}
