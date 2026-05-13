import { Link } from "@tanstack/react-router";
import { BookOpenText, LogIn, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user, isAdmin, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground shadow-book">
            <BookOpenText className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">
            Athenaeum
          </span>
          <span className="hidden text-xs text-muted-foreground md:inline">/ College Library</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link to="/" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            Catalog
          </Link>
          {isAdmin ? (
            <>
              <Link to="/admin" className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" /> Admin
              </Link>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </>
          ) : user ? (
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          ) : (
            <Link to="/login">
              <Button variant="outline" size="sm">
                <LogIn className="h-4 w-4" /> Staff sign in
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
