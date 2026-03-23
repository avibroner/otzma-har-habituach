"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface UserInfo {
  name: string;
  email: string;
}

interface UserLoginProps {
  onUserSelected: (user: UserInfo) => void;
}

const USER_STORAGE_KEY = "otzma-user";

export function getStoredUser(): UserInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (stored) {
      const user = JSON.parse(stored);
      if (user.name && user.email) return user;
    }
  } catch {
    // ignore
  }
  return null;
}

export function storeUser(user: UserInfo): void {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  localStorage.removeItem(USER_STORAGE_KEY);
}

export default function UserLogin({ onUserSelected }: UserLoginProps) {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEmail, setSelectedEmail] = useState("");

  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch("/api/users");
        const data = await res.json();
        if (data.users) {
          setUsers(data.users);
        } else {
          setError(data.error || "שגיאה בטעינת משתמשים");
        }
      } catch {
        setError("שגיאה בחיבור לשרת");
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  const handleLogin = () => {
    const user = users.find((u) => u.email === selectedEmail);
    if (user) {
      storeUser(user);
      onUserSelected(user);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
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
          <p className="text-sm text-white/50 mt-1">בחר את שמך כדי להמשיך</p>
        </div>

        {loading && (
          <p className="text-white/50 text-center">טוען משתמשים...</p>
        )}

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            <select
              value={selectedEmail}
              onChange={(e) => setSelectedEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-[#d8b368] focus:ring-1 focus:ring-[#d8b368] appearance-none cursor-pointer"
            >
              <option value="" className="bg-[#1a1f2e] text-white">
                — בחר משתמש —
              </option>
              {users.map((user) => (
                <option
                  key={user.email}
                  value={user.email}
                  className="bg-[#1a1f2e] text-white"
                >
                  {user.name} ({user.email})
                </option>
              ))}
            </select>

            <button
              onClick={handleLogin}
              disabled={!selectedEmail}
              className="w-full py-3 bg-[#d8b368] text-[#1a1f2e] rounded-xl font-bold hover:bg-[#c8a358] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              כניסה
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
