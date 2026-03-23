"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import UploadZone from "@/components/upload-zone";
import ProgressDisplay from "@/components/progress-display";
import UserLogin, { getStoredUser, clearStoredUser } from "@/components/user-login";
import type { ProgressUpdate } from "@/lib/types";

type AppState = "idle" | "processing" | "done" | "error";

interface UserInfo {
  name: string;
  email: string;
}

export default function Home() {
  const [state, setState] = useState<AppState>("idle");
  const [updates, setUpdates] = useState<ProgressUpdate[]>([]);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) setUser(stored);
    setCheckingUser(false);
  }, []);

  const handleFileSelected = useCallback(
    async (file: File) => {
      setState("processing");
      setUpdates([]);

      const formData = new FormData();
      formData.append("file", file);
      if (user) {
        formData.append("uploaderName", user.name);
        formData.append("uploaderEmail", user.email);
      }

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
    },
    [user]
  );

  const handleReset = useCallback(() => {
    setState("idle");
    setUpdates([]);
  }, []);

  const handleLogout = useCallback(() => {
    clearStoredUser();
    setUser(null);
  }, []);

  if (checkingUser) return null;

  // Show user login if not identified
  if (!user) {
    return (
      <>
        <div className="fixed inset-0 -z-10">
          <Image src="/bg.png" alt="" fill className="object-cover" priority quality={90} />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1f2e]/85 via-[#1a1f2e]/80 to-[#1a1f2e]/90" />
        </div>
        <UserLogin onUserSelected={(u) => setUser(u)} />
      </>
    );
  }

  return (
    <>
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <Image
          src="/bg.png"
          alt=""
          fill
          className="object-cover"
          priority
          quality={90}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1f2e]/85 via-[#1a1f2e]/80 to-[#1a1f2e]/90" />
      </div>

      {/* User badge + logout */}
      <div className="fixed top-4 left-4 z-20 flex items-center gap-2">
        <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-lg px-3 py-1.5 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#d8b368]/20 flex items-center justify-center">
            <span className="text-[#d8b368] text-xs font-bold">
              {user.name.charAt(0)}
            </span>
          </div>
          <span className="text-white text-sm">{user.name}</span>
          <button
            onClick={handleLogout}
            className="text-white/40 hover:text-white/70 text-xs mr-1 cursor-pointer"
            title="התנתק"
          >
            ✕
          </button>
        </div>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-5">
              <Image
                src="https://www.otzma-ins.co.il/wp-content/uploads/2025/12/cropped-logo.png"
                alt="עוצמה ביטוח"
                width={200}
                height={49}
                priority
                className="h-12 w-auto drop-shadow-lg"
              />
            </div>
            <h1 className="text-2xl font-bold text-white">הר הביטוח</h1>
            <p className="mt-1.5 text-sm text-white/50">
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
        </div>
      </main>
    </>
  );
}
