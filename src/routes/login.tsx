import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const t = useT();
  const { signIn, user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && isAdmin) navigate({ to: "/admin" });
  }, [user, isAdmin, loading, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) toast.error(error === "invalid_credentials" ? t("login.error.invalid") : error);
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-10 md:px-6">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-book">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-semibold">{t("login.title")}</h1>
              <p className="text-sm text-muted-foreground">{t("login.subtitle")}</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{t("login.hint.signIn")}</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("login.email")}</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("login.password")}</Label>
              <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? t("login.wait") : t("login.submit.signIn")}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
