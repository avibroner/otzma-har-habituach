"use client";

import type { ProgressUpdate, ProcessResult } from "@/lib/types";

interface ProgressDisplayProps {
  updates: ProgressUpdate[];
  onReset: () => void;
}

const STEP_LABELS: Record<string, string> = {
  parsing: "פרסור קובץ",
  searching: "חיפוש בפיירברי",
  loading_options: "טעינת ערכי שדות",
  creating: "יצירת רשומות",
  webhook: "עדכון סיכומי פרמיות",
};

const STEP_ORDER = ["parsing", "searching", "loading_options", "creating", "webhook"];

export default function ProgressDisplay({ updates, onReset }: ProgressDisplayProps) {
  if (updates.length === 0) return null;

  const lastUpdate = updates[updates.length - 1];
  const isDone = lastUpdate.step === "done";
  const isError = lastUpdate.step === "error";
  const currentStep = lastUpdate.step;

  let result: ProcessResult | null = null;
  if (isDone) {
    try {
      result = JSON.parse(lastUpdate.message);
    } catch {
      // ignore
    }
  }

  const currentStepIndex = STEP_ORDER.indexOf(currentStep);
  const creatingUpdate = updates.findLast((u) => u.step === "creating" && u.total);
  const subProgress =
    currentStep === "creating" && creatingUpdate?.current && creatingUpdate?.total
      ? Math.round((creatingUpdate.current / creatingUpdate.total) * 100)
      : null;
  const progressPercent = isDone
    ? 100
    : isError
      ? 0
      : subProgress ?? Math.round(((currentStepIndex + 1) / (STEP_ORDER.length + 1)) * 100);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 p-6 shadow-lg overflow-hidden">
        {/* Progress bar */}
        {!isDone && !isError && (
          <div className="mb-6">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-l from-[#d8b368] to-[#e8c878] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Success header */}
        {isDone && result && (
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/10">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-white">הטעינה הושלמה בהצלחה</p>
              <p className="text-sm text-white/60 truncate">
                {result.createdCount} רשומות נוצרו עבור ת.ז. {result.idNumber}
              </p>
            </div>
          </div>
        )}

        {/* Error header */}
        {isError && (
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/10">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-white">שגיאה</p>
              <p className="text-sm text-red-300 break-words">{lastUpdate.message}</p>
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-2.5">
          {STEP_ORDER.map((step) => {
            const stepUpdates = updates.filter((u) => u.step === step);
            if (stepUpdates.length === 0 && STEP_ORDER.indexOf(step) > currentStepIndex && !isDone) return null;

            const isActive = step === currentStep && !isDone && !isError;
            const isCompleted = STEP_ORDER.indexOf(step) < currentStepIndex || isDone;
            const isPending = STEP_ORDER.indexOf(step) > currentStepIndex && !isDone;
            const lastStepUpdate = stepUpdates[stepUpdates.length - 1];

            return (
              <div key={step} className="flex items-center gap-3 py-1.5">
                <div className="shrink-0 w-6 h-6 flex items-center justify-center">
                  {isCompleted ? (
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : isActive ? (
                    <div className="w-5 h-5 border-2 border-[#d8b368] border-t-transparent rounded-full animate-spin" />
                  ) : isPending ? (
                    <div className="w-5 h-5 rounded-full border-2 border-white/20" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-sm font-medium ${
                        isActive ? "text-[#d8b368]" : isCompleted ? "text-white" : "text-white/30"
                      }`}
                    >
                      {STEP_LABELS[step]}
                    </span>
                    {lastStepUpdate && (
                      <span className="text-xs text-white/40 truncate">
                        {lastStepUpdate.message}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Result details */}
        {result && (
          <div className="mt-5 pt-4 border-t border-white/10">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{result.createdCount}</p>
                <p className="text-xs text-white/50 mt-0.5">רשומות נוצרו</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{result.totalRows}</p>
                <p className="text-xs text-white/50 mt-0.5">שורות בקובץ</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-white/40 px-1">
              <span>ת.ז. {result.idNumber}</span>
              <span>{result.personType === "insured" ? "מבוטח" : "ליד"}</span>
            </div>
          </div>
        )}

        {/* Warnings */}
        {result?.warnings && result.warnings.length > 0 && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <p className="text-amber-300 text-xs font-semibold mb-1.5">
              ענפים לא ממופים ({result.warnings.length})
            </p>
            <div className="space-y-0.5">
              {result.warnings.map((w, i) => (
                <p key={i} className="text-amber-200/70 text-xs break-words">{w}</p>
              ))}
            </div>
            <a
              href="/admin?highlight=unmapped"
              target="_top"
              className="mt-3 block w-full py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-200 rounded-lg text-center text-sm font-medium transition-colors"
            >
              עבור להגדרות למיפוי הענפים
            </a>
          </div>
        )}

        {/* Errors */}
        {result?.errors && result.errors.length > 0 && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-300 text-xs font-semibold mb-1.5">
              שגיאות ({result.errors.length})
            </p>
            <div className="space-y-0.5">
              {result.errors.map((err, i) => (
                <p key={i} className="text-red-200/70 text-xs break-words">{err}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reset button */}
      {(isDone || isError) && (
        <button
          onClick={onReset}
          className="w-full py-3.5 bg-gradient-to-l from-[#d8b368] to-[#e8c878] text-[#1a1f2e] rounded-xl font-bold hover:from-[#c8a358] hover:to-[#d8b868] transition-all shadow-lg cursor-pointer"
        >
          העלה קובץ נוסף
        </button>
      )}
    </div>
  );
}
