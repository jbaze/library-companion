import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Archive, ArchiveRestore, Trash2, BookMinus, BookPlus, Library, ImageOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Book } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BookCover } from "@/components/BookCover";
import { toast } from "sonner";

type FormState = {
  title: string;
  author: string;
  isbn: string;
  category: string;
  total_copies: number;
  description: string;
  cover_url: string;
};

const empty: FormState = { title: "", author: "", isbn: "", category: "", total_copies: 1, description: "", cover_url: "" };

export function AdminConsole() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [sort, setSort] = useState<"title" | "author" | "available">("title");
  const [editing, setEditing] = useState<Book | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Book | null>(null);

  const { data: books, isLoading } = useQuery({
    queryKey: ["admin-books"],
    queryFn: async (): Promise<Book[]> => {
      const { data, error } = await supabase.from("books").select("*").order("title");
      if (error) throw error;
      return data as Book[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-books"] });
    qc.invalidateQueries({ queryKey: ["public-books"] });
  };

  const borrow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("borrow_book", { _book_id: id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Borrow recorded"); refresh(); },
    onError: (e: Error) => toast.error(humanError(e.message)),
  });
  const ret = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("return_book", { _book_id: id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Return recorded"); refresh(); },
    onError: (e: Error) => toast.error(humanError(e.message)),
  });
  const archive = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { error } = await supabase.from("books").update({ archived }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { toast.success(v.archived ? "Archived" : "Unarchived"); refresh(); },
    onError: (e: Error) => toast.error(humanError(e.message)),
  });
  const remove = useMutation({
    mutationFn: async (b: Book) => {
      if (b.available_copies < b.total_copies) {
        throw new Error("Cannot delete: some copies are still on loan. Archive the book instead.");
      }
      const { error } = await supabase.from("books").delete().eq("id", b.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Book deleted"); refresh(); setConfirmDelete(null); },
    onError: (e: Error) => toast.error(humanError(e.message)),
  });

  const filtered = (books ?? [])
    .filter((b) => {
      if (statusFilter === "active" && b.archived) return false;
      if (statusFilter === "archived" && !b.archived) return false;
      if (q.trim()) {
        const s = q.toLowerCase();
        return b.title.toLowerCase().includes(s) || b.author.toLowerCase().includes(s) || b.isbn.toLowerCase().includes(s);
      }
      return true;
    })
    .sort((a, b) =>
      sort === "title" ? a.title.localeCompare(b.title)
      : sort === "author" ? a.author.localeCompare(b.author)
      : b.available_copies - a.available_copies);

  const stats = {
    total: books?.length ?? 0,
    active: books?.filter(b => !b.archived).length ?? 0,
    onLoan: books?.reduce((s, b) => s + (b.total_copies - b.available_copies), 0) ?? 0,
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Books in catalog" value={stats.total} />
        <StatCard label="Active titles" value={stats.active} />
        <StatCard label="Copies on loan" value={stats.onLoan} />
      </div>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, author, ISBN…" className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="md:w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All books</SelectItem>
              <SelectItem value="active">Active only</SelectItem>
              <SelectItem value="archived">Archived only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="md:w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Sort: Title</SelectItem>
              <SelectItem value="author">Sort: Author</SelectItem>
              <SelectItem value="available">Sort: Most available</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={adding} onOpenChange={setAdding}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" /> Add book</Button>
            </DialogTrigger>
            <BookFormDialog
              key={adding ? "add" : "closed"}
              title="Add a new book"
              initial={empty}
              onClose={() => setAdding(false)}
              onSaved={() => { setAdding(false); refresh(); }}
            />
          </Dialog>
        </div>
      </Card>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <Library className="mx-auto mb-3 h-8 w-8 opacity-50" />
          No books match the current view.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {filtered.map((b) => (
              <li key={b.id} className={b.archived ? "bg-muted/40" : ""}>
                <div className="flex items-center gap-4 p-4">
                  <div className="hidden h-16 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-muted sm:block">
                    <BookCover url={b.cover_url} title={b.title} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-base font-semibold leading-tight truncate">{b.title}</h3>
                      {b.archived && <Badge variant="outline" className="border-warning text-warning">Archived</Badge>}
                      <Badge variant={b.available_copies > 0 ? "default" : "secondary"} className={b.available_copies > 0 ? "bg-success text-success-foreground hover:bg-success" : ""}>
                        {b.available_copies}/{b.total_copies}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{b.author} · {b.category} · ISBN {b.isbn}</p>
                    {b.last_activity_at && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {b.borrow_count} borrows · {b.return_count} returns · last {new Date(b.last_activity_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <Button size="sm" variant="outline" disabled={b.archived || b.available_copies === 0 || borrow.isPending} onClick={() => borrow.mutate(b.id)}>
                      <BookMinus className="h-4 w-4" /> Borrow
                    </Button>
                    <Button size="sm" variant="outline" disabled={b.available_copies >= b.total_copies || ret.isPending} onClick={() => ret.mutate(b.id)}>
                      <BookPlus className="h-4 w-4" /> Return
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(b)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => archive.mutate({ id: b.id, archived: !b.archived })}>
                      {b.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(b)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <BookFormDialog
            key={editing.id}
            title="Edit book"
            initial={{
              title: editing.title, author: editing.author, isbn: editing.isbn,
              category: editing.category, total_copies: editing.total_copies,
              description: editing.description ?? "", cover_url: editing.cover_url ?? "",
            }}
            editing={editing}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); refresh(); }}
          />
        )}
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this book?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes "{confirmDelete?.title}" from the catalog. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); if (confirmDelete) remove.mutate(confirmDelete); }}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold">{value}</p>
    </Card>
  );
}

function humanError(msg: string): string {
  if (msg.includes("duplicate key") && msg.includes("isbn")) return "A book with that ISBN already exists. Edit the existing book instead.";
  if (msg.includes("Cannot borrow")) return "Cannot borrow: no copies available or the book is archived.";
  if (msg.includes("Cannot return")) return "Cannot return: all copies are already in the library.";
  if (msg.includes("available_le_total") || msg.includes("available_copies_check")) return "Too many copies are currently borrowed to reduce the total. Wait for returns first.";
  if (msg.includes("Not authorized")) return "You don't have permission to do that.";
  return msg;
}

function BookFormDialog({
  title, initial, editing, onClose, onSaved,
}: {
  title: string;
  initial: FormState;
  editing?: Book;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("book-covers").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("book-covers").getPublicUrl(path);
      set("cover_url", data.publicUrl);
    } catch (e) {
      toast.error(`Upload failed: ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!form.title.trim() || !form.author.trim() || !form.isbn.trim() || !form.category.trim()) {
      toast.error("Title, author, ISBN, and category are required.");
      return;
    }
    if (form.total_copies < 0 || !Number.isInteger(form.total_copies)) {
      toast.error("Total copies must be a non-negative whole number.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const delta = form.total_copies - editing.total_copies;
        const newAvailable = editing.available_copies + delta;
        if (newAvailable < 0) {
          toast.error("Too many copies are currently borrowed to reduce the total. Wait for returns first.");
          setSaving(false);
          return;
        }
        const { error } = await supabase.from("books").update({
          title: form.title.trim(),
          author: form.author.trim(),
          isbn: form.isbn.trim(),
          category: form.category.trim(),
          description: form.description.trim() || null,
          cover_url: form.cover_url.trim() || null,
          total_copies: form.total_copies,
          available_copies: newAvailable,
        }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Book updated");
      } else {
        const { error } = await supabase.from("books").insert({
          title: form.title.trim(),
          author: form.author.trim(),
          isbn: form.isbn.trim(),
          category: form.category.trim(),
          description: form.description.trim() || null,
          cover_url: form.cover_url.trim() || null,
          total_copies: form.total_copies,
          available_copies: form.total_copies,
        });
        if (error) throw error;
        toast.success("Book added to catalog");
      }
      onSaved();
    } catch (e) {
      toast.error(humanError((e as Error).message));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="font-display">{title}</DialogTitle>
        <DialogDescription>
          {editing ? "Update the details for this book." : "Add a new book to the library catalog."}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-2 md:grid-cols-2">
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="t">Title</Label>
          <Input id="t" value={form.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="a">Author</Label>
          <Input id="a" value={form.author} onChange={(e) => set("author", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="i">ISBN / identifier</Label>
          <Input id="i" value={form.isbn} onChange={(e) => set("isbn", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c">Category</Label>
          <Input id="c" value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. Computer Science" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="n">Total copies</Label>
          <Input id="n" type="number" min={0} value={form.total_copies}
            onChange={(e) => set("total_copies", parseInt(e.target.value || "0", 10))} />
          {editing && (
            <p className="text-xs text-muted-foreground">
              Currently {editing.available_copies}/{editing.total_copies} available. Changing total adjusts available by the same amount.
            </p>
          )}
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="d">Description (optional)</Label>
          <Textarea id="d" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Cover image (optional)</Label>
          <div className="flex items-start gap-3">
            <div className="h-24 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
              {form.cover_url ? (
                <img src={form.cover_url} alt="cover preview" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-muted-foreground"><ImageOff className="h-5 w-5" /></div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <Input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
              />
              {form.cover_url && (
                <Button type="button" size="sm" variant="ghost" onClick={() => set("cover_url", "")}>
                  Remove cover
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving || uploading}>
          {saving ? "Saving…" : editing ? "Save changes" : "Add to catalog"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
