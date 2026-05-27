import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "mk" | "en";

const STORAGE_KEY = "lc:lang";
const DEFAULT_LANG: Lang = "mk";

type Dict = Record<string, string>;

const en: Dict = {
  // Site / header
  "site.brand": "Athenaeum",
  "site.tagline": "/ College Library",
  "nav.catalog": "Catalog",
  "nav.admin": "Admin",
  "nav.signOut": "Sign out",
  "nav.staffSignIn": "Staff sign in",
  "lang.label": "Language",
  "lang.mk": "Macedonian",
  "lang.en": "English",

  // Meta
  "meta.rootTitle": "Athenaeum — College Library Catalog",
  "meta.rootDescription": "Browse the college library catalog and check real-time book availability.",
  "meta.catalogTitle": "Catalog — Athenaeum College Library",
  "meta.catalogDescription": "Search the college library catalog and see live availability for every book.",

  // Root error / 404
  "root.notFound.title": "Page not found",
  "root.notFound.body": "That shelf is empty. Try the catalog instead.",
  "root.notFound.cta": "Browse catalog",
  "root.error.title": "Something went wrong",
  "root.error.retry": "Try again",
  "root.error.home": "Go home",

  // Catalog (index)
  "catalog.badge": "Live availability",
  "catalog.hero.title": "Every book on the shelves, in real time.",
  "catalog.hero.body": "Search the catalog, check what's free to borrow today, and walk into the library knowing exactly what's waiting.",
  "catalog.search.placeholder": "Search by title, author, or ISBN…",
  "catalog.filter.category": "Category",
  "catalog.filter.allCategories": "All categories",
  "catalog.filter.allBooks": "All books",
  "catalog.filter.availableNow": "Available now",
  "catalog.sort.titleAZ": "A–Z by title",
  "catalog.sort.newest": "Newest first",
  "catalog.badge.available": "Available",
  "catalog.badge.allBorrowed": "All borrowed",
  "catalog.availability": "{available} of {total} available",
  "catalog.results.one": "{count} book found",
  "catalog.results.other": "{count} books found",
  "catalog.empty.noMatch.title": "No books match your search",
  "catalog.empty.noBooks.title": "The catalog is empty",
  "catalog.empty.noMatch.body": "Try a different keyword or clear the filters.",
  "catalog.empty.noBooks.body": "An administrator hasn't added any books yet. Check back soon.",
  "catalog.empty.clear": "Clear filters",

  // Book detail
  "book.back": "Back to catalog",
  "book.notFound.title": "Book not found",
  "book.notFound.body": "It may have been archived or removed.",
  "book.notFound.cta": "Browse the catalog",
  "book.byAuthor": "by {author}",
  "book.badge.available": "Available",
  "book.badge.allBorrowed": "All copies borrowed",
  "book.isbn": "ISBN {isbn}",
  "book.deskNote": "Borrowing happens in person at the library desk. Bring your student ID and ask a librarian for this title.",
  "book.coverAlt": "Cover of {title}",

  // Login
  "login.title": "Library staff",
  "login.subtitle": "Administrator access only.",
  "login.tab.signIn": "Sign in",
  "login.tab.signUp": "Create account",
  "login.hint.signIn": "Use your administrator credentials.",
  "login.hint.signUp": "The first account created becomes the administrator.",
  "login.email": "Email",
  "login.password": "Password",
  "login.wait": "Please wait…",
  "login.submit.signIn": "Sign in",
  "login.submit.signUp": "Create account",
  "login.error.invalid": "Invalid email or password.",
  "login.toast.created": "Account created. You're signed in.",

  // Admin page
  "admin.title": "Library administration",
  "admin.subtitle": "Manage the catalog and record borrowings as they happen at the desk.",

  // Admin console
  "admin.stat.total": "Books in catalog",
  "admin.stat.active": "Active titles",
  "admin.stat.onLoan": "Copies on loan",
  "admin.search.placeholder": "Search title, author, ISBN…",
  "admin.filter.all": "All books",
  "admin.filter.active": "Active only",
  "admin.filter.archived": "Archived only",
  "admin.sort.title": "Sort: Title",
  "admin.sort.author": "Sort: Author",
  "admin.sort.available": "Sort: Most available",
  "admin.addBook": "Add book",
  "admin.empty": "No books match the current view.",
  "admin.badge.archived": "Archived",
  "admin.action.borrow": "Borrow",
  "admin.action.return": "Return",
  "admin.loan.borrow.title": "Confirm borrow",
  "admin.loan.borrow.body": "Record a copy of \"{title}\" as borrowed.",
  "admin.loan.borrow.confirm": "Confirm borrow",
  "admin.loan.return.title": "Confirm return",
  "admin.loan.return.body": "Record a copy of \"{title}\" as returned.",
  "admin.loan.return.confirm": "Confirm return",
  "admin.loan.studentNumber": "Student number",
  "admin.loan.studentNumber.placeholder": "e.g. 12345",
  "admin.loan.firstName": "First name",
  "admin.loan.lastName": "Last name",
  "admin.loan.optionalHint": "All fields are optional. When provided, they're saved with the loan record and help match the right copy on return.",
  "admin.activity": "{borrows} borrows · {returns} returns · last {when}",
  "admin.toast.borrow": "Borrow recorded",
  "admin.toast.return": "Return recorded",
  "admin.toast.archived": "Archived",
  "admin.toast.unarchived": "Unarchived",
  "admin.toast.deleted": "Book deleted",
  "admin.toast.added": "Book added to catalog",
  "admin.toast.updated": "Book updated",
  "admin.delete.title": "Delete this book?",
  "admin.delete.body": "This permanently removes \"{title}\" from the catalog. This cannot be undone.",
  "admin.delete.cancel": "Cancel",
  "admin.delete.confirm": "Delete permanently",
  "admin.delete.stat.copies": "{available}/{total} copies in library",
  "admin.delete.stat.activity": "{borrows} borrows · {returns} returns",
  "admin.delete.ack": "I understand this permanently deletes the book and its activity history.",

  // Bulk import
  "import.button": "Bulk import",
  "import.title": "Bulk import books from CSV",
  "import.description": "Upload a CSV file. You'll see a preview before anything is added.",
  "import.format": "Required CSV columns",
  "import.formatHint": "First row must be the header. total_copies, description, and cover_url are optional.",
  "import.clear": "Clear",
  "import.error.empty": "The file appears to be empty.",
  "import.error.missingColumns": "Missing required columns: {cols}",
  "import.error.duplicateIsbnDb": "Import failed: one or more ISBNs already exist in the catalog.",
  "import.preview.valid": "{count} valid",
  "import.preview.invalid": "{count} with errors",
  "import.col.title": "Title",
  "import.col.author": "Author",
  "import.col.category": "Category",
  "import.col.copies": "Copies",
  "import.col.status": "Status",
  "import.row.ok": "Ready",
  "import.confirm": "Import {count} books",
  "import.importing": "Importing…",
  "import.toast.success": "Imported {count} books",

  // Book form dialog
  "form.add.title": "Add a new book",
  "form.edit.title": "Edit book",
  "form.add.description": "Add a new book to the library catalog.",
  "form.edit.description": "Update the details for this book.",
  "form.field.title": "Title",
  "form.field.author": "Author",
  "form.field.isbn": "ISBN / identifier",
  "form.field.category": "Category",
  "form.field.categoryPlaceholder": "e.g. Computer Science",
  "form.field.totalCopies": "Total copies",
  "form.field.totalCopies.hint": "Currently {available}/{total} available. Changing total adjusts available by the same amount.",
  "form.field.description": "Description (optional)",
  "form.field.cover": "Cover image (optional)",
  "form.cover.remove": "Remove cover",
  "form.cancel": "Cancel",
  "form.saving": "Saving…",
  "form.save": "Save changes",
  "form.addToCatalog": "Add to catalog",

  // Pagination
  "pagination.showing": "Showing {from}–{to} of {total}",
  "pagination.perPage": "{count} per page",
  "pagination.perPageLabel": "Items per page",
  "pagination.label": "Pagination",
  "pagination.first": "First page",
  "pagination.previous": "Previous page",
  "pagination.next": "Next page",
  "pagination.last": "Last page",
  "pagination.page": "Page {page}",

  // Errors
  "error.duplicateIsbn": "A book with that ISBN already exists. Edit the existing book instead.",
  "error.cannotBorrow": "Cannot borrow: no copies available or the book is archived.",
  "error.cannotReturn": "Cannot return: all copies are already in the library.",
  "error.tooManyBorrowed": "Too many copies are currently borrowed to reduce the total. Wait for returns first.",
  "error.notAuthorized": "You don't have permission to do that.",
  "error.required": "Title, author, ISBN, and category are required.",
  "error.totalNonNegative": "Total copies must be a non-negative whole number.",
  "error.cannotDelete": "Cannot delete: some copies are still on loan. Archive the book instead.",
  "error.uploadFailed": "Upload failed: {message}",
};

const mk: Dict = {
  // Site / header
  "site.brand": "Факултет за Биотехнички Науки – Битола",
  "site.tagline": "/ Универзитетска библиотека",
  "nav.catalog": "Каталог",
  "nav.admin": "Администрација",
  "nav.signOut": "Одјави се",
  "nav.staffSignIn": "Најава на персонал",
  "lang.label": "Јазик",
  "lang.mk": "Македонски",
  "lang.en": "Англиски",

  // Meta
  "meta.rootTitle": "Факултет за Биотехнички Науки – Битола",
  "meta.rootDescription": "Прелистајте го каталогот на универзитетската библиотека и проверете ја достапноста на книгите во реално време.",
  "meta.catalogTitle": "Каталог — Факултет за Биотехнички Науки – Битола",
  "meta.catalogDescription": "Пребарајте го каталогот на универзитетската библиотека и видете ја достапноста на секоја книга во живо.",

  // Root error / 404
  "root.notFound.title": "Страницата не е пронајдена",
  "root.notFound.body": "Таа полица е празна. Обидете се со каталогот.",
  "root.notFound.cta": "Разгледај го каталогот",
  "root.error.title": "Нешто тргна наопаку",
  "root.error.retry": "Обиди се повторно",
  "root.error.home": "Кон почетна",

  // Catalog (index)
  "catalog.badge": "Достапност во живо",
  "catalog.hero.title": "Сите книги на полиците, во реално време.",
  "catalog.hero.body": "Пребарајте го каталогот, проверете што е слободно за позајмување денес и дојдете во библиотеката знаејќи точно што ве чека.",
  "catalog.search.placeholder": "Пребарај по наслов, автор или ISBN…",
  "catalog.filter.category": "Категорија",
  "catalog.filter.allCategories": "Сите категории",
  "catalog.filter.allBooks": "Сите книги",
  "catalog.filter.availableNow": "Достапни сега",
  "catalog.sort.titleAZ": "А–Ш по наслов",
  "catalog.sort.newest": "Најнови први",
  "catalog.badge.available": "Достапна",
  "catalog.badge.allBorrowed": "Сите се позајмени",
  "catalog.availability": "{available} од {total} достапни",
  "catalog.results.one": "Пронајдена {count} книга",
  "catalog.results.other": "Пронајдени {count} книги",
  "catalog.empty.noMatch.title": "Ниедна книга не одговара на вашето пребарување",
  "catalog.empty.noBooks.title": "Каталогот е празен",
  "catalog.empty.noMatch.body": "Обидете се со друг збор или исчистете ги филтрите.",
  "catalog.empty.noBooks.body": "Администраторот сè уште не додал книги. Проверете подоцна.",
  "catalog.empty.clear": "Исчисти ги филтрите",

  // Book detail
  "book.back": "Назад кон каталогот",
  "book.notFound.title": "Книгата не е пронајдена",
  "book.notFound.body": "Можеби е архивирана или отстранета.",
  "book.notFound.cta": "Разгледај го каталогот",
  "book.byAuthor": "од {author}",
  "book.badge.available": "Достапна",
  "book.badge.allBorrowed": "Сите примероци се позајмени",
  "book.isbn": "ISBN {isbn}",
  "book.deskNote": "Позајмувањето се врши лично на пултот во библиотеката. Понесете студентска легитимација и побарајте го насловот од библиотекарот.",
  "book.coverAlt": "Корица на {title}",

  // Login
  "login.title": "Персонал на библиотеката",
  "login.subtitle": "Пристап само за администратори.",
  "login.tab.signIn": "Најави се",
  "login.tab.signUp": "Создади сметка",
  "login.hint.signIn": "Користете ги вашите администраторски податоци.",
  "login.hint.signUp": "Првата создадена сметка станува администраторска.",
  "login.email": "Е-пошта",
  "login.password": "Лозинка",
  "login.wait": "Почекајте…",
  "login.submit.signIn": "Најави се",
  "login.submit.signUp": "Создади сметка",
  "login.error.invalid": "Неточна е-пошта или лозинка.",
  "login.toast.created": "Сметката е создадена. Најавени сте.",

  // Admin page
  "admin.title": "Администрација на библиотеката",
  "admin.subtitle": "Управувајте со каталогот и евидентирајте позајмувања на пултот.",

  // Admin console
  "admin.stat.total": "Книги во каталог",
  "admin.stat.active": "Активни наслови",
  "admin.stat.onLoan": "Примероци на позајмица",
  "admin.search.placeholder": "Пребарај наслов, автор, ISBN…",
  "admin.filter.all": "Сите книги",
  "admin.filter.active": "Само активни",
  "admin.filter.archived": "Само архивирани",
  "admin.sort.title": "Подреди: Наслов",
  "admin.sort.author": "Подреди: Автор",
  "admin.sort.available": "Подреди: Најмногу достапни",
  "admin.addBook": "Додај книга",
  "admin.empty": "Ниедна книга не одговара на тековниот приказ.",
  "admin.badge.archived": "Архивирана",
  "admin.action.borrow": "Позајми",
  "admin.action.return": "Врати",
  "admin.loan.borrow.title": "Потврди позајмување",
  "admin.loan.borrow.body": "Запиши еден примерок од „{title}“ како позајмен.",
  "admin.loan.borrow.confirm": "Потврди позајмување",
  "admin.loan.return.title": "Потврди враќање",
  "admin.loan.return.body": "Запиши еден примерок од „{title}“ како вратен.",
  "admin.loan.return.confirm": "Потврди враќање",
  "admin.loan.studentNumber": "Број на студент",
  "admin.loan.studentNumber.placeholder": "на пр. 12345",
  "admin.loan.firstName": "Име",
  "admin.loan.lastName": "Презиме",
  "admin.loan.optionalHint": "Сите полиња се незадолжителни. Кога се внесени, се зачувуваат заедно со позајмицата и помагаат да се препознае точниот примерок при враќање.",
  "admin.activity": "{borrows} позајмици · {returns} враќања · последно {when}",
  "admin.toast.borrow": "Позајмицата е евидентирана",
  "admin.toast.return": "Враќањето е евидентирано",
  "admin.toast.archived": "Архивирана",
  "admin.toast.unarchived": "Вратена од архива",
  "admin.toast.deleted": "Книгата е избришана",
  "admin.toast.added": "Книгата е додадена во каталогот",
  "admin.toast.updated": "Книгата е ажурирана",
  "admin.delete.title": "Да се избрише оваа книга?",
  "admin.delete.body": "Ова трајно ја отстранува „{title}“ од каталогот. Не може да се врати.",
  "admin.delete.cancel": "Откажи",
  "admin.delete.confirm": "Избриши трајно",
  "admin.delete.stat.copies": "{available}/{total} примероци во библиотеката",
  "admin.delete.stat.activity": "{borrows} позајмици · {returns} враќања",
  "admin.delete.ack": "Разбирам дека ова трајно ја брише книгата и нејзината историја.",

  // Bulk import
  "import.button": "Масовен увоз",
  "import.title": "Масовен увоз на книги од CSV",
  "import.description": "Прикачете CSV-датотека. Ќе видите преглед пред да се додаде нешто.",
  "import.format": "Задолжителни колони во CSV",
  "import.formatHint": "Првиот ред мора да биде заглавие. total_copies, description и cover_url се изборни.",
  "import.clear": "Исчисти",
  "import.error.empty": "Датотеката изгледа празна.",
  "import.error.missingColumns": "Недостасуваат задолжителни колони: {cols}",
  "import.error.duplicateIsbnDb": "Увозот не успеа: еден или повеќе ISBN веќе постојат во каталогот.",
  "import.preview.valid": "{count} валидни",
  "import.preview.invalid": "{count} со грешки",
  "import.col.title": "Наслов",
  "import.col.author": "Автор",
  "import.col.category": "Категорија",
  "import.col.copies": "Примероци",
  "import.col.status": "Статус",
  "import.row.ok": "Подготвено",
  "import.confirm": "Увези {count} книги",
  "import.importing": "Се увезува…",
  "import.toast.success": "Увезени {count} книги",

  // Book form dialog
  "form.add.title": "Додај нова книга",
  "form.edit.title": "Уреди книга",
  "form.add.description": "Додајте нова книга во каталогот на библиотеката.",
  "form.edit.description": "Ажурирајте ги податоците за оваа книга.",
  "form.field.title": "Наслов",
  "form.field.author": "Автор",
  "form.field.isbn": "ISBN / идентификатор",
  "form.field.category": "Категорија",
  "form.field.categoryPlaceholder": "на пр. Компјутерски науки",
  "form.field.totalCopies": "Вкупно примероци",
  "form.field.totalCopies.hint": "Моментално {available}/{total} достапни. Менувањето на вкупниот број ја прилагодува достапноста за истата вредност.",
  "form.field.description": "Опис (изборно)",
  "form.field.cover": "Слика на корица (изборно)",
  "form.cover.remove": "Отстрани корица",
  "form.cancel": "Откажи",
  "form.saving": "Се зачувува…",
  "form.save": "Зачувај промени",
  "form.addToCatalog": "Додај во каталог",

  // Pagination
  "pagination.showing": "Прикажани {from}–{to} од {total}",
  "pagination.perPage": "{count} по страница",
  "pagination.perPageLabel": "Ставки по страница",
  "pagination.label": "Странични контроли",
  "pagination.first": "Прва страница",
  "pagination.previous": "Претходна страница",
  "pagination.next": "Следна страница",
  "pagination.last": "Последна страница",
  "pagination.page": "Страница {page}",

  // Errors
  "error.duplicateIsbn": "Веќе постои книга со тој ISBN. Уредете ја постојната книга наместо тоа.",
  "error.cannotBorrow": "Не може да се позајми: нема достапни примероци или книгата е архивирана.",
  "error.cannotReturn": "Не може да се врати: сите примероци се веќе во библиотеката.",
  "error.tooManyBorrowed": "Премногу примероци се моментално позајмени за да се намали вкупниот број. Почекајте враќања прво.",
  "error.notAuthorized": "Немате дозвола за тоа.",
  "error.required": "Насловот, авторот, ISBN и категоријата се задолжителни.",
  "error.totalNonNegative": "Вкупниот број примероци мора да биде ненегативен цел број.",
  "error.cannotDelete": "Не може да се избрише: некои примероци сè уште се позајмени. Архивирајте ја книгата наместо тоа.",
  "error.uploadFailed": "Прикачувањето не успеа: {message}",
};

const dictionaries: Record<Lang, Dict> = { mk, en };

function format(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

function getInitialLang(): Lang {
  if (typeof window === "undefined") return DEFAULT_LANG;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "mk" || stored === "en") return stored;
  } catch {
    // ignore
  }
  return DEFAULT_LANG;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    setLangState(getInitialLang());
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const value = useMemo<I18nCtx>(() => {
    const dict = dictionaries[lang];
    const fallback = dictionaries.en;
    return {
      lang,
      setLang: (l: Lang) => {
        setLangState(l);
        try {
          window.localStorage.setItem(STORAGE_KEY, l);
        } catch {
          // ignore
        }
      },
      t: (key, vars) => format(dict[key] ?? fallback[key] ?? key, vars),
    };
  }, [lang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n must be used inside I18nProvider");
  return c;
}

export function useT() {
  return useI18n().t;
}
