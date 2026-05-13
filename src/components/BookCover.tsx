import { BookOpen } from "lucide-react";
import { useT } from "@/lib/i18n";

export function BookCover({
  url,
  title,
  className = "",
}: {
  url: string | null;
  title: string;
  className?: string;
}) {
  const t = useT();
  if (url) {
    return (
      <img
        src={url}
        alt={t("book.coverAlt", { title })}
        loading="lazy"
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }
  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-secondary to-muted p-4 text-center text-muted-foreground ${className}`}
    >
      <BookOpen className="h-8 w-8 opacity-50" />
      <p className="line-clamp-3 text-xs font-medium">{title}</p>
    </div>
  );
}
