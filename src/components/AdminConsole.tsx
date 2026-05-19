import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Archive, ArchiveRestore, Trash2, BookMinus, BookPlus, Library, ImageOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Book } from "@/lib/types";
import { useT } from "@/lib/i18n";
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
import { BulkImportDialog } from "@/components/BulkImportDialog";
import { BooksPagination } from "@/components/BooksPagination";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const ADMIN_PAGE_SIZES = [10, 20, 50];

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

type TFn = (key: string, vars?: Record<string, string | number>) => string;

function humanError(msg: string, t: TFn): string {
  if (msg.includes("duplicate key") && msg.includes("isbn")) return t("error.duplicateIsbn");
  if (msg.includes("Cannot borrow")) return t("error.cannotBorrow");
  if (msg.includes("Cannot return")) return t("error.cannotReturn");
  if (msg.includes("available_le_total") || msg.includes("available_copies_check")) return t("error.tooManyBorrowed");
  if (msg.includes("Not authorized")) return t("error.notAuthorized");
  return msg;
}

export function AdminConsole() {
  const t = useT();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [sort, setSort] = useState<"title" | "author" | "available">("title");
  const [editing, setEditing] = useState<Book | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Book | null>(null);
  const [deleteAck, setDeleteAck] = useState(false);
  const [borrowFor, setBorrowFor] = useState<Book | null>(null);
  const [returnFor, setReturnFor] = useState<Book | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ADMIN_PAGE_SIZES[0]);

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
    onSuccess: () => { toast.success(t("admin.toast.borrow")); refresh(); setBorrowFor(null); },
    onError: (e: Error) => toast.error(humanError(e.message, t)),
  });
  const ret = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("return_book", { _book_id: id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(t("admin.toast.return")); refresh(); setReturnFor(null); },
    onError: (e: Error) => toast.error(humanError(e.message, t)),
  });
  const archive = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { error } = await supabase.from("books").update({ archived }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { toast.success(v.archived ? t("admin.toast.archived") : t("admin.toast.unarchived")); refresh(); },
    onError: (e: Error) => toast.error(humanError(e.message, t)),
  });
  const remove = useMutation({
    mutationFn: async (b: Book) => {
      if (b.available_copies < b.total_copies) {
        throw new Error(t("error.cannotDelete"));
      }
      const { error } = await supabase.from("books").delete().eq("id", b.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(t("admin.toast.deleted")); refresh(); setConfirmDelete(null); },
    onError: (e: Error) => toast.error(humanError(e.message, t)),
  });

  const filtered = useMemo(
    () =>
      (books ?? [])
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
          : b.available_copies - a.available_copies),
    [books, q, statusFilter, sort],
  );

  useEffect(() => {
    setPage(1);
  }, [q, statusFilter, sort, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize],
  );

  const stats = {
    total: books?.length ?? 0,
    active: books?.filter(b => !b.archived).length ?? 0,
    onLoan: books?.reduce((s, b) => s + (b.total_copies - b.available_copies), 0) ?? 0,
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label={t("admin.stat.total")} value={stats.total} />
        <StatCard label={t("admin.stat.active")} value={stats.active} />
        <StatCard label={t("admin.stat.onLoan")} value={stats.onLoan} />
      </div>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admin.search.placeholder")} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="md:w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.filter.all")}</SelectItem>
              <SelectItem value="active">{t("admin.filter.active")}</SelectItem>
              <SelectItem value="archived">{t("admin.filter.archived")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="md:w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="title">{t("admin.sort.title")}</SelectItem>
              <SelectItem value="author">{t("admin.sort.author")}</SelectItem>
              <SelectItem value="available">{t("admin.sort.available")}</SelectItem>
            </SelectContent>
          </Select>
          <BulkImportDialog />
          <Dialog open={adding} onOpenChange={setAdding}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" /> {t("admin.addBook")}</Button>
            </DialogTrigger>
            <BookFormDialog
              key={adding ? "add" : "closed"}
              title={t("form.add.title")}
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
          {t("admin.empty")}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {paged.map((b) => (
              <li key={b.id} className={b.archived ? "bg-muted/40" : ""}>
                <div className="flex items-center gap-4 p-4">
                  <div className="hidden h-16 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-muted sm:block">
                    <BookCover url={b.cover_url} title={b.title} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-base font-semibold leading-tight truncate">{b.title}</h3>
                      {b.archived && <Badge variant="outline" className="border-warning text-warning">{t("admin.badge.archived")}</Badge>}
                      <Badge variant={b.available_copies > 0 ? "default" : "secondary"} className={b.available_copies > 0 ? "bg-success text-success-foreground hover:bg-success" : ""}>
                        {b.available_copies}/{b.total_copies}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{b.author} · {b.category} · ISBN {b.isbn}</p>
                    {b.last_activity_at && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t("admin.activity", { borrows: b.borrow_count, returns: b.return_count, when: new Date(b.last_activity_at).toLocaleString() })}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <Button size="sm" variant="outline" disabled={b.archived || b.available_copies === 0 || borrow.isPending} onClick={() => setBorrowFor(b)}>
                      <BookMinus className="h-4 w-4" /> {t("admin.action.borrow")}
                    </Button>
                    <Button size="sm" variant="outline" disabled={b.available_copies >= b.total_copies || ret.isPending} onClick={() => setReturnFor(b)}>
                      <BookPlus className="h-4 w-4" /> {t("admin.action.return")}
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

      {!isLoading && filtered.length > 0 && (
        <BooksPagination
          page={currentPage}
          pageSize={pageSize}
          total={filtered.length}
          pageSizeOptions={ADMIN_PAGE_SIZES}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      <BorrowReturnDialog
        book={borrowFor}
        mode="borrow"
        pending={borrow.isPending}
        onCancel={() => setBorrowFor(null)}
        onConfirm={() => borrowFor && borrow.mutate(borrowFor.id)}
      />
      <BorrowReturnDialog
        book={returnFor}
        mode="return"
        pending={ret.isPending}
        onCancel={() => setReturnFor(null)}
        onConfirm={() => returnFor && ret.mutate(returnFor.id)}
      />

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <BookFormDialog
            key={editing.id}
            title={t("form.edit.title")}
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

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => { if (!o) { setConfirmDelete(null); setDeleteAck(false); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.delete.body", { title: confirmDelete?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirmDelete && (
            <div className="space-y-3">
              <Card className="bg-muted/40 p-3">
                <p className="font-display text-base font-semibold leading-tight">{confirmDelete.title}</p>
                <p className="text-sm text-muted-foreground">{confirmDelete.author} · ISBN {confirmDelete.isbn}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary">
                    {t("admin.delete.stat.copies", {
                      available: confirmDelete.available_copies,
                      total: confirmDelete.total_copies,
                    })}
                  </Badge>
                  <Badge variant="secondary">
                    {t("admin.delete.stat.activity", {
                      borrows: confirmDelete.borrow_count,
                      returns: confirmDelete.return_count,
                    })}
                  </Badge>
                </div>
              </Card>
              {confirmDelete.available_copies < confirmDelete.total_copies && (
                <p className="text-sm text-destructive">{t("error.cannotDelete")}</p>
              )}
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={deleteAck}
                  onCheckedChange={(v) => setDeleteAck(v === true)}
                  className="mt-0.5"
                />
                <span>{t("admin.delete.ack")}</span>
              </label>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteAck(false)}>{t("admin.delete.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={!deleteAck || remove.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              onClick={(e) => {
                e.preventDefault();
                if (confirmDelete && deleteAck) {
                  remove.mutate(confirmDelete);
                  setDeleteAck(false);
                }
              }}
            >
              {t("admin.delete.confirm")}
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

function BorrowReturnDialog({
  book,
  mode,
  pending,
  onCancel,
  onConfirm,
}: {
  book: Book | null;
  mode: "borrow" | "return";
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const t = useT();
  const [studentNumber, setStudentNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    if (!book) {
      setStudentNumber("");
      setFirstName("");
      setLastName("");
    }
  }, [book]);

  return (
    <Dialog open={!!book} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">
            {t(mode === "borrow" ? "admin.loan.borrow.title" : "admin.loan.return.title")}
          </DialogTitle>
          <DialogDescription>
            {t(mode === "borrow" ? "admin.loan.borrow.body" : "admin.loan.return.body", {
              title: book?.title ?? "",
            })}
          </DialogDescription>
        </DialogHeader>
        {book && (
          <div className="space-y-4">
            <Card className="bg-muted/40 p-3">
              <p className="font-display text-base font-semibold leading-tight">{book.title}</p>
              <p className="text-sm text-muted-foreground">
                {book.author} · ISBN {book.isbn}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">
                  {t("admin.delete.stat.copies", {
                    available: book.available_copies,
                    total: book.total_copies,
                  })}
                </Badge>
              </div>
            </Card>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="lsn">{t("admin.loan.studentNumber")}</Label>
                <Input
                  id="lsn"
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  placeholder={t("admin.loan.studentNumber.placeholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lfn">{t("admin.loan.firstName")}</Label>
                <Input id="lfn" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lln">{t("admin.loan.lastName")}</Label>
                <Input id="lln" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t("admin.loan.optionalHint")}</p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={pending}>
            {t("admin.delete.cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={pending}>
            {pending
              ? t("form.saving")
              : t(mode === "borrow" ? "admin.loan.borrow.confirm" : "admin.loan.return.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
  const t = useT();
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
      toast.error(t("error.uploadFailed", { message: (e as Error).message }));
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!form.title.trim() || !form.author.trim() || !form.isbn.trim() || !form.category.trim()) {
      toast.error(t("error.required"));
      return;
    }
    if (form.total_copies < 0 || !Number.isInteger(form.total_copies)) {
      toast.error(t("error.totalNonNegative"));
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const delta = form.total_copies - editing.total_copies;
        const newAvailable = editing.available_copies + delta;
        if (newAvailable < 0) {
          toast.error(t("error.tooManyBorrowed"));
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
        toast.success(t("admin.toast.updated"));
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
        toast.success(t("admin.toast.added"));
      }
      onSaved();
    } catch (e) {
      toast.error(humanError((e as Error).message, t));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="font-display">{title}</DialogTitle>
        <DialogDescription>
          {editing ? t("form.edit.description") : t("form.add.description")}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-2 md:grid-cols-2">
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="t">{t("form.field.title")}</Label>
          <Input id="t" value={form.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="a">{t("form.field.author")}</Label>
          <Input id="a" value={form.author} onChange={(e) => set("author", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="i">{t("form.field.isbn")}</Label>
          <Input id="i" value={form.isbn} onChange={(e) => set("isbn", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c">{t("form.field.category")}</Label>
          <Input id="c" value={form.category} onChange={(e) => set("category", e.target.value)} placeholder={t("form.field.categoryPlaceholder")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="n">{t("form.field.totalCopies")}</Label>
          <Input id="n" type="number" min={0} value={form.total_copies}
            onChange={(e) => set("total_copies", parseInt(e.target.value || "0", 10))} />
          {editing && (
            <p className="text-xs text-muted-foreground">
              {t("form.field.totalCopies.hint", { available: editing.available_copies, total: editing.total_copies })}
            </p>
          )}
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="d">{t("form.field.description")}</Label>
          <Textarea id="d" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>{t("form.field.cover")}</Label>
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
                  {t("form.cover.remove")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>{t("form.cancel")}</Button>
        <Button onClick={handleSave} disabled={saving || uploading}>
          {saving ? t("form.saving") : editing ? t("form.save") : t("form.addToCatalog")}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
