"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import UploadZone from "@/components/upload-zone";
import ProgressDisplay from "@/components/progress-display";
import type { ProgressUpdate } from "@/lib/types";

type AppState = "idle" | "processing" | "done" | "error";

export default function Home() {
  const [state, setState] = useState<AppState>("idle");
  const [updates, setUpdates] = useState<ProgressUpdate[]>([]);

  const handleFileSelected = useCallback(async (file: File) => {
    setState("processing");
    setUpdates([]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/process-excel", {
        method: "POST",
        body: formData,
      });

      if (!response.body) {
        setUpdates([{ step: "error", message: "אין תגובה מהשרת" }]);
        setState("error");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim()) {
            try {
              const update: ProgressUpdate = JSON.parse(line);
              setUpdates((prev) => [...prev, update]);

              if (update.step === "done") setState("done");
              if (update.step === "error") setState("error");
            } catch {
              // skip malformed lines
            }
          }
        }
      }
    } catch (err) {
      setUpdates((prev) => [
        ...prev,
        {
          step: "error" as const,
          message: err instanceof Error ? err.message : "שגיאה בחיבור לשרת",
        },
      ]);
      setState("error");
    }
  }, []);

  const handleReset = useCallback(() => {
    setState("idle");
    setUpdates([]);
  }, []);

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <Image
              src="https://www.otzma-ins.co.il/wp-content/uploads/2025/12/cropped-logo.png"
              alt="עוצמה ביטוח"
              width={180}
              height={44}
              priority
              className="h-11 w-auto"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">הר הביטוח</h1>
          <p className="mt-1.5 text-sm text-gray-400">
            טעינת נתוני הר הביטוח לפיירברי
          </p>
        </div>

        {/* Content */}
        {state === "idle" && (
          <UploadZone onFileSelected={handleFileSelected} />
        )}

        {state !== "idle" && (
          <ProgressDisplay updates={updates} onReset={handleReset} />
        )}

        {/* Footer */}
        <div className="mt-8 flex items-center justify-between text-xs text-gray-300 px-1">
          <a
            href="/admin"
            className="hover:text-gray-500 transition-colors"
          >
            הגדרות
          </a>
          <span>עוצמה סוכנות לביטוח</span>
        </div>
      </div>
    </main>
  );
}
