"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useAuth } from "@/providers/auth-provider";

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();

  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ usernameOrEmail?: string; password?: string }>({});

  const validate = () => {
    const errors: { usernameOrEmail?: string; password?: string } = {};
    if (!usernameOrEmail.trim()) errors.usernameOrEmail = "Username or email is required";
    if (!password) errors.password = "Password is required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      await login(usernameOrEmail.trim(), password);
      const token = localStorage.getItem("gymmis_token");
      if (token) {
        document.cookie = `token=${token}; path=/; max-age=86400; samesite=lax`;
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[500px] rounded-[15px] border border-slate-200/80 bg-white px-8 pb-11 pt-11 shadow-[0_3px_8px_rgba(15,23,42,0.18)] sm:px-8 sm:pt-12">
      <div className="text-center">
        <h2 className="text-[28px] font-bold leading-tight tracking-[-0.03em] text-slate-950">Welcome Back!</h2>
        <p className="mt-1 text-[14px] leading-5 text-slate-400">
          Sign in to access your account
        </p>
      </div>

      {error && (
        <Alert variant="error" title="Sign in failed" className="mt-7">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="mt-12 space-y-6" noValidate>
        <Input
          id="username"
          label="Login Identifier (User Name)"
          type="text"
          placeholder="Enter user name"
          autoComplete="username"
          value={usernameOrEmail}
          onChange={(e) => setUsernameOrEmail(e.target.value)}
          error={fieldErrors.usernameOrEmail}
          className="h-10 rounded-[6px] border-slate-300 px-3 text-[12px] shadow-none placeholder:text-slate-300 focus:border-slate-400 focus:ring-1 focus:ring-slate-200"
          containerClassName="space-y-1.5"
        />

        <div className="space-y-1.5">
          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="Enter password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            className="h-10 rounded-[6px] border-slate-300 px-3 text-[12px] shadow-none placeholder:text-slate-300 focus:border-slate-400 focus:ring-1 focus:ring-slate-200"
            containerClassName="space-y-1.5"
          />
          <div className="pt-4 text-right">
            <button
              type="button"
              className="text-[12px] font-medium text-[#ed1118] transition-colors hover:text-[#bd0b10] focus:outline-none focus-visible:underline"
            >
              Forgot password?
            </button>
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={loading}
          className="mt-3 h-10 rounded-[6px] bg-[#ed1118] text-[16px] font-semibold shadow-none hover:bg-[#d50d13] focus-visible:ring-[#ed1118]"
        >
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <div className="mt-16 flex items-center justify-center gap-2 text-[12px] text-slate-500">
        <ShieldCheck className="h-[18px] w-[18px] text-slate-400" strokeWidth={1.5} />
        Secure and Trusted
      </div>
    </div>
  );
}