"use client";

import { useState, useEffect, useCallback } from "react";

interface BranchOption {
  name: string;
  value: string;
}

interface BufferOption {
  name: string;
  value: string;
}

interface BranchMapping {
  [branchName: string]: string; // branch name → buffer value
}

const STORAGE_KEY = "otzma-buffer-mapping";

export default function AdminPage() {
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [buffers, setBuffers] = useState<BufferOption[]>([]);
  const [mapping, setMapping] = useState<BranchMapping>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/field-options");
        const data = await res.json();
        setBranches(data.branches);
        setBuffers(data.buffers);

        // Load saved mapping from server, then overlay localStorage
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
  }, []);

  const handleBufferChange = useCallback(
    (branchName: string, bufferValue: string) => {
      setMapping((prev) => ({ ...prev, [branchName]: bufferValue }));
      setHasChanges(true);
    },
    []
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mapping));

      // Also save to server
      await fetch("/api/field-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapping }),
      });

      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  }, [mapping]);

  const unmappedCount = branches.filter((b) => !mapping[b.name]).length;

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">טוען נתונים מפיירברי...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-red-600">{error}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              הגדרות — מיפוי ענפים
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {branches.length} ענפים משניים | {unmappedCount > 0 && (
                <span className="text-orange-600 font-medium">
                  {unmappedCount} ללא חוצץ
                </span>
              )}
              {unmappedCount === 0 && (
                <span className="text-green-600">הכל ממופה</span>
              )}
            </p>
          </div>
          <div className="flex gap-3">
            <a
              href="/"
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              חזרה
            </a>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                hasChanges
                  ? "bg-blue-500 text-white hover:bg-blue-600"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {saving ? "שומר..." : "שמור"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-right px-4 py-3 font-medium text-gray-600">
                  ענף משני
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">
                  מזהה
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">
                  חוצץ
                </th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <tr
                  key={branch.value}
                  className={`border-b border-gray-100 ${
                    !mapping[branch.name] ? "bg-orange-50" : ""
                  }`}
                >
                  <td className="px-4 py-2.5 text-gray-800">{branch.name}</td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs font-mono">
                    {branch.value}
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={mapping[branch.name] || ""}
                      onChange={(e) =>
                        handleBufferChange(branch.name, e.target.value)
                      }
                      className={`w-full px-2 py-1.5 rounded border text-sm ${
                        mapping[branch.name]
                          ? "border-gray-300 bg-white"
                          : "border-orange-300 bg-orange-50"
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
