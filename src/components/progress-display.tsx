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
  webhook: "סיום",
  done: "הושלם",
  error: "שגיאה",
};

const STEP_ORDER = ["parsing", "searching", "loading_options", "creating", "webhook", "done"];

export default function ProgressDisplay({ updates, onReset }: ProgressDisplayProps) {
  if (updates.length === 0) return null;

  const lastUpdate = updates[updates.length - 1];
  const isDone = lastUpdate.step === "done";
  const isError = lastUpdate.step === "error";
  const currentStep = lastUpdate.step;

  // Parse result from done message
  let result: ProcessResult | null = null;
  if (isDone) {
    try {
      result = JSON.parse(lastUpdate.message);
    } catch {
      // ignore
    }
  }

  // Calculate progress percentage
  const currentStepIndex = STEP_ORDER.indexOf(currentStep);
  const progressPercent = isDone
    ? 100
    : isError
      ? 0
      : Math.round(((currentStepIndex + 1) / STEP_ORDER.length) * 100);

  // For creating step, use the sub-progress
  const creatingUpdate = updates.findLast((u) => u.step === "creating" && u.total);
  const subProgress =
    currentStep === "creating" && creatingUpdate?.current && creatingUpdate?.total
      ? Math.round((creatingUpdate.current / creatingUpdate.total) * 100)
      : null;

  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
      {/* Progress bar */}
      {!isDone && !isError && (
        <div className="mb-6">
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${subProgress ?? progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-3">
        {STEP_ORDER.map((step) => {
          const stepUpdates = updates.filter((u) => u.step === step);
          if (stepUpdates.length === 0 && step !== currentStep) return null;

          const isActive = step === currentStep && !isDone && !isError;
          const isCompleted =
            STEP_ORDER.indexOf(step) < currentStepIndex || isDone;
          const lastStepUpdate = stepUpdates[stepUpdates.length - 1];

          return (
            <div key={step} className="flex items-start gap-3">
              <div className="mt-0.5">
                {isCompleted ? (
                  <span className="text-green-500 text-lg">&#10003;</span>
                ) : isActive ? (
                  <span className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="text-gray-300 text-lg">&#9675;</span>
                )}
              </div>
              <div>
                <p
                  className={`text-sm font-medium ${
                    isActive
                      ? "text-blue-600"
                      : isCompleted
                        ? "text-gray-600"
                        : "text-gray-400"
                  }`}
                >
                  {STEP_LABELS[step]}
                </p>
                {lastStepUpdate && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {lastStepUpdate.message}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Error */}
      {isError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-700 font-medium text-sm">{lastUpdate.message}</p>
        </div>
      )}

      {/* Result summary */}
      {result && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-green-700 font-bold mb-2">
            הטעינה הושלמה בהצלחה!
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm text-green-800">
            <div>ת.ז.: {result.idNumber}</div>
            <div>
              סוג: {result.personType === "insured" ? "מבוטח" : "ליד"}
            </div>
            <div>נוצרו: {result.createdCount} רשומות</div>
            <div>מתוך: {result.totalRows} שורות</div>
          </div>
          {result.warnings?.length > 0 && (
            <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-orange-700 text-xs font-medium mb-1">
                ענפים לא ממופים ({result.warnings.length}):
              </p>
              {result.warnings.map((w, i) => (
                <p key={i} className="text-orange-600 text-xs">
                  {w}
                </p>
              ))}
            </div>
          )}
          {result.errors?.length > 0 && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-xs font-medium mb-1">
                שגיאות ({result.errors.length}):
              </p>
              {result.errors.map((err, i) => (
                <p key={i} className="text-red-600 text-xs">
                  {err}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reset button */}
      {(isDone || isError) && (
        <button
          onClick={onReset}
          className="mt-4 w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors cursor-pointer"
        >
          העלה קובץ נוסף
        </button>
      )}
    </div>
  );
}
