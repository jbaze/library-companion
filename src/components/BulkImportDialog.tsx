import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, AlertCircle, CheckCircle2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type ParsedRow = {
  rowNumber: number;
  raw: Record<string, string>;
  data: {
    title: string;
    author: string;
    isbn: string;
    category: string;
    description: string | null;
    cover_url: string | null;
    total_copies: number;
  } | null;
  errors: string[];
};

const REQUIRED = ["title", "author", "isbn", "category"] as const;

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        cur.push(field); field = "";
        if (cur.some((v) => v.trim() !== "")) rows.push(cur);
        cur = [];
      } else { field += c; }
    }
  }
  if (field !== "" || cur.length > 0) {
    cur.push(field);
    if (cur.some((v) => v.trim() !== "")) rows.push(cur);
  }
  if (rows.length === 0) return { headers: [], rows: [] };
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return { headers, rows: rows.slice(1) };
}

function validateRow(rowNumber: number, raw: Record<string, string>): ParsedRow {
  const errors: string[] = [];
  for (const k of REQUIRED) {
    if (!(raw[k] ?? "").trim()) errors.push(`Missing ${k}`);
  }
  const totalRaw = (raw.total_copies ?? "1").trim();
  const total = parseInt(totalRaw, 10);
  if (Number.isNaN(total) || total < 0) errors.push("total_copies must be a non-negative integer");

  if (errors.length > 0) return { rowNumber, raw, data: null, errors };
  return {
    rowNumber,
    raw,
    data: {
      title: raw.title.trim(),
      author: raw.author.trim(),
      isbn: raw.isbn.trim(),
      category: raw.category.trim(),
      description: (raw.description ?? "").trim() || null,
      cover_url: (raw.cover_url ?? "").trim() || null,
      total_copies: total,
    },
    errors: [],
  };
}

export function BulkImportDialog() {
  const t = useT();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filename, setFilename] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  function reset() {
    setFilename(null);
    setParsed([]);
    setParseError(null);
  }

  function handleFile(file: File) {
    setFilename(file.name);
    setParseError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const { headers, rows } = parseCSV(text);
        if (headers.length === 0) {
          setParseError(t("import.error.empty"));
          setParsed([]);
          return;
        }
        const missing = REQUIRED.filter((c) => !headers.includes(c));
        if (missing.length > 0) {
          setParseError(t("import.error.missingColumns", { cols: missing.join(", ") }));
          setParsed([]);
          return;
        }
        const seenIsbn = new Set<string>();
        const result: ParsedRow[] = rows.map((cells, idx) => {
          const raw: Record<string, string> = {};
          headers.forEach((h, i) => { raw[h] = cells[i] ?? ""; });
          const r = validateRow(idx + 2, raw);
          if (r.data) {
            const key = r.data.isbn.toLowerCase();
            if (seenIsbn.has(key)) r.errors.push("Duplicate ISBN within file");
            else seenIsbn.add(key);
          }
          if (r.errors.length > 0) r.data = null;
          return r;
        });
        setParsed(result);
      } catch (e) {
        setParseError((e as Error).message);
        setParsed([]);
      }
    };
    reader.readAsText(file);
  }

  const validRows = parsed.filter((r) => r.data);
  const invalidRows = parsed.filter((r) => !r.data);

  const importMut = useMutation({
    mutationFn: async () => {
      const payload = validRows.map((r) => ({
        ...r.data!,
        available_copies: r.data!.total_copies,
      }));
      const { error, data } = await supabase.from("books").insert(payload).select("id");
      if (error) throw error;
      return data?.length ?? 0;
    },
    onSuccess: (count) => {
      toast.success(t("import.toast.success", { count }));
      qc.invalidateQueries({ queryKey: ["admin-books"] });
      qc.invalidateQueries({ queryKey: ["public-books"] });
      setOpen(false);
      reset();
    },
    onError: (e: Error) => {
      const msg = e.message.includes("duplicate key") && e.message.includes("isbn")
        ? t("import.error.duplicateIsbnDb")
        : e.message;
      toast.error(msg);
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline"><Upload className="h-4 w-4" /> {t("import.button")}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display">{t("import.title")}</DialogTitle>
          <DialogDescription>{t("import.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("import.format")}</p>
            <code className="mt-2 block overflow-x-auto rounded bg-muted px-3 py-2 text-xs">
              title,author,isbn,category,total_copies,description,cover_url
            </code>
            <p className="mt-2 text-xs text-muted-foreground">{t("import.formatHint")}</p>
          </Card>

          <div className="flex items-center gap-3">
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {filename && (
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="h-4 w-4" /> {t("import.clear")}
              </Button>
            )}
          </div>

          {parseError && (
            <Card className="border-destructive bg-destructive/5 p-3 text-sm text-destructive">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{parseError}</p>
              </div>
            </Card>
          )}

          {parsed.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-success text-success-foreground hover:bg-success">
                  <CheckCircle2 className="h-3 w-3" /> {t("import.preview.valid", { count: validRows.length })}
                </Badge>
                {invalidRows.length > 0 && (
                  <Badge variant="outline" className="border-destructive text-destructive">
                    <AlertCircle className="h-3 w-3" /> {t("import.preview.invalid", { count: invalidRows.length })}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  <FileText className="mr-1 inline h-3 w-3" /> {filename}
                </span>
              </div>

              <Card className="max-h-72 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">{t("import.col.title")}</th>
                      <th className="p-2">{t("import.col.author")}</th>
                      <th className="p-2">ISBN</th>
                      <th className="p-2">{t("import.col.category")}</th>
                      <th className="p-2 text-right">{t("import.col.copies")}</th>
                      <th className="p-2">{t("import.col.status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((r) => (
                      <tr key={r.rowNumber} className={`border-t border-border ${r.errors.length > 0 ? "bg-destructive/5" : ""}`}>
                        <td className="p-2 text-muted-foreground">{r.rowNumber}</td>
                        <td className="p-2">{r.raw.title || <span className="text-muted-foreground">—</span>}</td>
                        <td className="p-2">{r.raw.author || <span className="text-muted-foreground">—</span>}</td>
                        <td className="p-2 font-mono text-xs">{r.raw.isbn || <span className="text-muted-foreground">—</span>}</td>
                        <td className="p-2">{r.raw.category || <span className="text-muted-foreground">—</span>}</td>
                        <td className="p-2 text-right">{r.raw.total_copies || "1"}</td>
                        <td className="p-2">
                          {r.errors.length === 0 ? (
                            <span className="text-success">{t("import.row.ok")}</span>
                          ) : (
                            <span className="text-destructive text-xs">{r.errors.join("; ")}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false); reset(); }} disabled={importMut.isPending}>
            {t("form.cancel")}
          </Button>
          <Button
            onClick={() => importMut.mutate()}
            disabled={validRows.length === 0 || importMut.isPending}
          >
            {importMut.isPending ? t("import.importing") : t("import.confirm", { count: validRows.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
