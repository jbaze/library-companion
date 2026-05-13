import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Library, BookOpenCheck, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Book } from "@/lib/types";
import { SiteHeader } from "@/components/SiteHeader";
import { BookCover } from "@/components/BookCover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Catalog — Athenaeum College Library" },
      { name: "description", content: "Search the college library catalog and see live availability for every book." },
      { property: "og:title", content: "Catalog — Athenaeum College Library" },
      { property: "og:description", content: "Search the college library catalog and see live availability for every book." },
    ],
  }),
  component: CatalogPage,
});

function CatalogPage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [availability, setAvailability] = useState<"all" | "available">("all");
  const [sort, setSort] = useState<"title" | "newest">("title");

  const { data: books, isLoading } = useQuery({
    queryKey: ["public-books"],
    queryFn: async (): Promise<Book[]> => {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("archived", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Book[];
    },
    refetchOnWindowFocus: true,
  });

  const categories = useMemo(() => {
    const set = new Set((books ?? []).map((b) => b.category));
    return Array.from(set).sort();
  }, [books]);

  const filtered = useMemo(() => {
    let list = books ?? [];
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(s) ||
          b.author.toLowerCase().includes(s) ||
          b.isbn.toLowerCase().includes(s),
      );
    }
    if (category !== "all") list = list.filter((b) => b.category === category);
    if (availability === "available") list = list.filter((b) => b.available_copies > 0);
    list = [...list].sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return list;
  }, [books, q, category, availability, sort]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="border-b border-border/60 bg-[image:var(--gradient-hero)]">
        <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Library className="h-3.5 w-3.5" /> Live availability
            </span>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
              Every book on the shelves, in real time.
            </h1>
            <p className="mt-4 text-base text-muted-foreground md:text-lg">
              Search the catalog, check what's free to borrow today, and walk into the library
              knowing exactly what's waiting.
            </p>
          </div>

          <div className="mt-8 grid gap-3 rounded-2xl border border-border bg-card p-3 shadow-book md:grid-cols-[1fr_auto_auto_auto] md:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by title, author, or ISBN…"
                className="h-11 pl-9"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-11 md:w-[180px]">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={availability} onValueChange={(v) => setAvailability(v as "all" | "available")}>
              <SelectTrigger className="h-11 md:w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All books</SelectItem>
                <SelectItem value="available">Available now</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as "title" | "newest")}>
              <SelectTrigger className="h-11 md:w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="title">A–Z by title</SelectItem>
                <SelectItem value="newest">Newest first</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState hasBooks={(books?.length ?? 0) > 0} onClear={() => { setQ(""); setCategory("all"); setAvailability("all"); }} />
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "book" : "books"} found
            </p>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((b) => <CatalogCard key={b.id} book={b} />)}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function CatalogCard({ book }: { book: Book }) {
  const free = book.available_copies > 0;
  return (
    <Link
      to="/books/$id"
      params={{ id: book.id }}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-book"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-muted">
        <BookCover url={book.cover_url} title={book.title} className="transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute left-2 top-2">
          {free ? (
            <Badge className="bg-success text-success-foreground hover:bg-success">Available</Badge>
          ) : (
            <Badge variant="secondary" className="bg-foreground/85 text-background">All borrowed</Badge>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{book.category}</p>
        <h3 className="line-clamp-2 font-display text-base font-semibold leading-tight">{book.title}</h3>
        <p className="text-sm text-muted-foreground">{book.author}</p>
        <p className="mt-auto pt-2 text-xs text-muted-foreground">
          {book.available_copies} of {book.total_copies} available
        </p>
      </div>
    </Link>
  );
}

function EmptyState({ hasBooks, onClear }: { hasBooks: boolean; onClear: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-secondary text-secondary-foreground">
        <BookOpenCheck className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">
        {hasBooks ? "No books match your search" : "The catalog is empty"}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {hasBooks
          ? "Try a different keyword or clear the filters."
          : "An administrator hasn't added any books yet. Check back soon."}
      </p>
      {hasBooks && (
        <Button variant="outline" className="mt-4" onClick={onClear}>Clear filters</Button>
      )}
    </div>
  );
}
