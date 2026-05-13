import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminConsole } from "@/components/AdminConsole";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate({ to: "/login" });
  }, [user, isAdmin, loading, navigate]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Library administration
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage the catalog and record borrowings as they happen at the desk.
          </p>
        </div>
        <AdminConsole />
      </main>
    </div>
  );
}
