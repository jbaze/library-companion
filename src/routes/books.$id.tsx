import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Book } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { BookCover } from "@/components/BookCover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/books/$id")({
  component: BookDetail,
});

function BookDetail() {
  const t = useT();
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: book, isLoading, error } = useQuery({
    queryKey: ["book", id],
    queryFn: async (): Promise<Book | null> => {
      const { data, error } = await supabase.from("books").select("*").eq("id", id).eq("archived", false).maybeSingle();
      if (error) throw error;
      return data as Book | null;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/" })} className="mb-6">
          <ArrowLeft className="h-4 w-4" /> {t("book.back")}
        </Button>
        {isLoading ? (
          <div className="h-96 animate-pulse rounded-2xl bg-muted" />
        ) : !book || error ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <h2 className="font-display text-2xl font-semibold">{t("book.notFound.title")}</h2>
            <p className="mt-2 text-muted-foreground">{t("book.notFound.body")}</p>
            <Link to="/" className="mt-4 inline-block text-primary underline">{t("book.notFound.cta")}</Link>
          </div>
        ) : (
          <article className="grid gap-8 md:grid-cols-[280px_1fr]">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-book">
              <div className="aspect-[2/3]">
                <BookCover url={book.cover_url} title={book.title} />
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{book.category}</p>
              <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">{book.title}</h1>
              <p className="mt-2 text-lg text-muted-foreground">{t("book.byAuthor", { author: book.author })}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {book.available_copies > 0 ? (
                  <Badge className="bg-success text-success-foreground hover:bg-success">{t("book.badge.available")}</Badge>
                ) : (
                  <Badge variant="secondary">{t("book.badge.allBorrowed")}</Badge>
                )}
                <Badge variant="outline">{t("catalog.availability", { available: book.available_copies, total: book.total_copies })}</Badge>
                <Badge variant="outline">{t("book.isbn", { isbn: book.isbn })}</Badge>
              </div>
              {book.description && (
                <p className="mt-6 whitespace-pre-line leading-relaxed text-foreground/90">
                  {book.description}
                </p>
              )}
              <div className="mt-8 rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
                {t("book.deskNote")}
              </div>
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
