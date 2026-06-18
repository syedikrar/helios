import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Sun } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Button, Card, Input, Label } from "../components/ui";
import { DEMO_ROLES, DEMO_PASSWORD } from "../lib/demoRoles";

export function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("admin@helios.demo");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (user) return <Navigate to="/dashboard" replace />;

  async function doLogin(e: string, p: string, tag: string) {
    setError(null);
    setBusy(tag);
    try {
      await login(e, p);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ?? "Login failed — check your credentials.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: brand + form */}
      <div className="flex items-center justify-center bg-navy-800 px-6 py-12 text-white">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2">
            <Sun className="text-amber-500" />
            <span className="text-xl font-bold">Helios</span>
          </div>
          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="mt-1 text-sm text-navy-100/70">
            Total Cost &amp; Turnaround Management Platform
          </p>

          <form
            className="mt-6 space-y-4"
            onSubmit={(ev) => {
              ev.preventDefault();
              doLogin(email, password, "form");
            }}
          >
            <div>
              <Label>Email</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-navy-900"
                type="email"
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-navy-900"
                type="password"
              />
            </div>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <Button className="w-full" disabled={busy !== null}>
              {busy === "form" ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
      </div>

      {/* Right: quick login */}
      <div className="flex items-center justify-center bg-navy-50 px-6 py-12">
        <div className="w-full max-w-md">
          <h2 className="text-lg font-semibold text-navy-900">Quick login as…</h2>
          <p className="mt-1 text-sm text-navy-700/70">
            Demo only — one click signs you in as that role to explore its
            navigation and access.
          </p>
          <Card className="mt-4 divide-y divide-navy-100 p-2">
            {DEMO_ROLES.map((r) => (
              <button
                key={r.roleKey}
                disabled={busy !== null}
                onClick={() => doLogin(r.email, DEMO_PASSWORD, r.roleKey)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-navy-50 disabled:opacity-50"
              >
                <span>
                  <span className="font-medium text-navy-900">{r.label}</span>
                  <span className="ml-2 text-xs text-navy-700/50">{r.email}</span>
                </span>
                <span className="text-xs text-teal-600">
                  {busy === r.roleKey ? "…" : "Sign in"}
                </span>
              </button>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
