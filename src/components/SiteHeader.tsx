import { Link } from "@tanstack/react-router";
import { Globe, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n, type Lang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SiteHeader() {
  const { user, isAdmin, signOut } = useAuth();
  const { lang, setLang, t } = useI18n();
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2 group">
          <img src="/logo.png" alt={t("site.brand")} className="h-9 w-9 shrink-0 object-contain" />
          <span className="hidden font-display text-base font-semibold tracking-tight whitespace-nowrap md:inline md:text-lg">
            {t("site.brand")}
          </span>
        </Link>
        <nav className="flex shrink-0 items-center gap-2">
          <Link to="/" className="hidden rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground sm:inline">
            {t("nav.catalog")}
          </Link>
          <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
            <SelectTrigger aria-label={t("lang.label")} className="h-8 w-auto gap-1.5 px-2">
              <Globe className="h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="mk">{t("lang.mk")}</SelectItem>
              <SelectItem value="en">{t("lang.en")}</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin ? (
            <>
              <Link to="/admin" className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" /> {t("nav.admin")}
              </Link>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="h-4 w-4" /> {t("nav.signOut")}
              </Button>
            </>
          ) : user ? (
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" /> {t("nav.signOut")}
            </Button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
