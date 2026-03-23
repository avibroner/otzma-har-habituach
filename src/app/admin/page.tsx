"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AdminLogin from "@/components/admin-login";

interface BranchOption {
  name: string;
  value: string;
}

interface BufferOption {
  name: string;
  value: string;
}

interface BranchMapping {
  [branchName: string]: string;
}

interface UploadLogEntry {
  uploaderName: string;
  uploaderEmail: string;
  fileName: string;
  timestamp: string;
  idNumber: string;
  personType: string;
  totalRows: number;
  createdCount: number;
  errorsCount: number;
  warningsCount: number;
  unmappedBranches: string[];
}

const STORAGE_KEY = "otzma-buffer-mapping";

export default function AdminPage() {
  return (
    <Suspense fallback={<main className="flex-1 flex items-center justify-center"><p className="text-white/50">טוען...</p></main>}>
      <AdminPageContent />
    </Suspense>
  );
}

function AdminPageContent() {
  const searchParams = useSearchParams();
  const highlightUnmapped = searchParams.get("highlight") === "unmapped";

  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [buffers, setBuffers] = useState<BufferOption[]>([]);
  const [mapping, setMapping] = useState<BranchMapping>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<"mapping" | "history">("mapping");
  const [uploadLogs, setUploadLogs] = useState<UploadLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const firstUnmappedRef = useRef<HTMLTableRowElement | null>(null);

  // Check auth
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/admin-auth");
        const data = await res.json();
        setAuthenticated(data.authenticated);
      } catch {
        setAuthenticated(false);
      }
    }
    checkAuth();
  }, []);

  // Load mapping data
  useEffect(() => {
    if (!authenticated) return;

    async function load() {
      try {
        const res = await fetch("/api/field-options");
        const data = await res.json();
        setBranches(data.branches);
        setBuffers(data.buffers);

        const savedMapping = data.mapping || {};
        const localMapping = localStorage.getItem(STORAGE_KEY);
        const local = localMapping ? JSON.parse(localMapping) : {};
        setMapping({ ...savedMapping, ...local });
      } catch (err) {
        setError(err instanceof Error ? err.message : "שגיאה בטעינה");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [authenticated]);

  // Scroll to first unmapped branch
  useEffect(() => {
    if (highlightUnmapped && !loading && firstUnmappedRef.current) {
      firstUnmappedRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightUnmapped, loading]);

  // Load upload logs when switching to history tab
  useEffect(() => {
    if (activeTab !== "history" || uploadLogs.length > 0) return;

    async function loadLogs() {
      setLogsLoading(true);
      try {
        const res = await fetch("/api/upload-log");
        if (res.ok) {
          const data = await res.json();
          setUploadLogs(data.logs || []);
        }
      } catch {
        // ignore
      } finally {
        setLogsLoading(false);
      }
    }
    loadLogs();
  }, [activeTab, uploadLogs.length]);

  const handleBufferChange = useCallback(
    (branchName: string, bufferValue: string) => {
      setMapping((prev) => ({ ...prev, [branchName]: bufferValue }));
      setHasChanges(true);
      setSaved(false);
    },
    []
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mapping));
      await fetch("/api/field-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapping }),
      });
      setHasChanges(false);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  }, [mapping]);

  const handleLogout = useCallback(async () => {
    await fetch("/api/admin-auth", { method: "DELETE" });
    setAuthenticated(false);
  }, []);

  // Auth check loading
  if (authenticated === null) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-white/50">בודק הרשאות...</p>
      </main>
    );
  }

  // Not authenticated — show login
  if (!authenticated) {
    return <AdminLogin onAuthenticated={() => setAuthenticated(true)} />;
  }

  const unmappedCount = branches.filter((b) => !mapping[b.name]).length;
  let firstUnmappedFound = false;

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-white/50">טוען נתונים מפיירברי...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">הגדרות מערכת</h1>
            <p className="text-sm text-white/50 mt-1">
              {branches.length} ענפים משניים |{" "}
              {unmappedCount > 0 ? (
                <span className="text-orange-400 font-medium">
                  {unmappedCount} ללא חוצץ
                </span>
              ) : (
                <span className="text-green-400">הכל ממופה</span>
              )}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-white/60 border border-white/20 rounded-lg hover:bg-white/10 cursor-pointer"
            >
              יציאה
            </button>
            {activeTab === "mapping" && (
              <button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                  hasChanges
                    ? "bg-[#d8b368] text-[#1a1f2e] hover:bg-[#c8a358]"
                    : "bg-white/10 text-white/30 cursor-not-allowed"
                }`}
              >
                {saving ? "שומר..." : "שמור"}
              </button>
            )}
          </div>
        </div>

        {/* Saved message */}
        {saved && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-300 text-sm text-center">
            המיפוי עודכן בהצלחה — חזור לעמוד הראשי להעלאה מחדש
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-white/5 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("mapping")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === "mapping"
                ? "bg-white/15 text-white"
                : "text-white/50 hover:text-white/70"
            }`}
          >
            מיפוי ענפים
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === "history"
                ? "bg-white/15 text-white"
                : "text-white/50 hover:text-white/70"
            }`}
          >
            היסטוריית העלאות
          </button>
        </div>

        {/* Mapping Tab */}
        {activeTab === "mapping" && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">
                    ענף משני
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">
                    מזהה
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">
                    חוצץ
                  </th>
                </tr>
              </thead>
              <tbody>
                {branches.map((branch) => {
                  const isUnmapped = !mapping[branch.name];
                  const isFirstUnmapped = isUnmapped && !firstUnmappedFound;
                  if (isFirstUnmapped) firstUnmappedFound = true;

                  return (
                    <tr
                      key={branch.value}
                      ref={isFirstUnmapped ? firstUnmappedRef : undefined}
                      className={`border-b border-gray-100 ${
                        isUnmapped
                          ? highlightUnmapped
                            ? "bg-orange-100"
                            : "bg-orange-50"
                          : "bg-white"
                      }`}
                    >
                      <td className="px-4 py-2.5 text-gray-900 font-medium">
                        {branch.name}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs font-mono">
                        {branch.value}
                      </td>
                      <td className="px-4 py-2.5">
                        <select
                          value={mapping[branch.name] || ""}
                          onChange={(e) =>
                            handleBufferChange(branch.name, e.target.value)
                          }
                          className={`w-full px-2 py-1.5 rounded border text-sm text-gray-900 ${
                            mapping[branch.name]
                              ? "border-gray-300 bg-white"
                              : "border-orange-400 bg-orange-50"
                          }`}
                        >
                          <option value="">— בחר חוצץ —</option>
                          {buffers.map((buf) => (
                            <option key={buf.value} value={buf.value}>
                              {buf.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-lg">
            {logsLoading ? (
              <p className="p-6 text-center text-gray-500">טוען היסטוריה...</p>
            ) : uploadLogs.length === 0 ? (
              <p className="p-6 text-center text-gray-500">
                אין היסטוריית העלאות
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">
                      תאריך
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">
                      מעלה
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">
                      ת.ז.
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">
                      שורות
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">
                      נוצרו
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">
                      סטטוס
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {uploadLogs.map((log, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-2.5 text-gray-600 text-xs">
                        {new Date(log.timestamp).toLocaleString("he-IL")}
                      </td>
                      <td className="px-4 py-2.5 text-gray-900">
                        {log.uploaderName}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 font-mono text-xs">
                        {log.idNumber}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 text-center">
                        {log.totalRows}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 text-center">
                        {log.createdCount}
                      </td>
                      <td className="px-4 py-2.5">
                        {log.errorsCount > 0 ? (
                          <span className="text-red-600 text-xs">
                            {log.errorsCount} שגיאות
                          </span>
                        ) : log.warningsCount > 0 ? (
                          <span className="text-amber-600 text-xs">
                            {log.warningsCount} אזהרות
                          </span>
                        ) : (
                          <span className="text-green-600 text-xs">תקין</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
