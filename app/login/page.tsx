"use client";

import React, { useState } from "react";
import { Diamond, Lock, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/"); // Go to Dashboard
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Invalid Credentials");
      }
    } catch (err) {
      setError("System Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-200">
      <div className="w-full max-w-md p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">

        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700 shadow-inner">
            <Diamond className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-light tracking-widest text-white">CARATBRIDGE</h1>
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-2">Internal Access Only</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block pl-1">
                Access Key
            </label>
            <div className="relative group">
                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-500 group-focus-within:text-white transition-colors" />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 pl-10 text-white outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 transition-all placeholder:text-slate-700"
                    placeholder="Enter Password..."
                    autoFocus
                />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-xs text-center">
                {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-bold py-4 rounded-lg hover:bg-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {loading ? "Verifying..." : "ENTER VAULT"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <p className="text-[10px] text-center text-slate-700 mt-8">
            Secured by AES-256 Encryption
        </p>
      </div>
    </div>
  );
}