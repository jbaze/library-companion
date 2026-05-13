
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Books
CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  total_copies INTEGER NOT NULL DEFAULT 1 CHECK (total_copies >= 0),
  available_copies INTEGER NOT NULL DEFAULT 1 CHECK (available_copies >= 0),
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  borrow_count INTEGER NOT NULL DEFAULT 0,
  return_count INTEGER NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT available_le_total CHECK (available_copies <= total_copies)
);

CREATE INDEX books_archived_idx ON public.books(archived);
CREATE INDEX books_category_idx ON public.books(category);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Public can read non-archived books
CREATE POLICY "Public reads active books" ON public.books FOR SELECT TO anon, authenticated
USING (archived = FALSE OR public.has_role(auth.uid(), 'admin'));

-- Only admins can write
CREATE POLICY "Admins insert books" ON public.books FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update books" ON public.books FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete books" ON public.books FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER books_set_updated_at BEFORE UPDATE ON public.books
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Borrow / Return RPCs (atomic, server-enforced)
CREATE OR REPLACE FUNCTION public.borrow_book(_book_id UUID)
RETURNS public.books LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.books;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.books
    SET available_copies = available_copies - 1,
        borrow_count = borrow_count + 1,
        last_activity_at = now()
    WHERE id = _book_id AND archived = FALSE AND available_copies > 0
    RETURNING * INTO b;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cannot borrow: book unavailable or archived';
  END IF;
  RETURN b;
END; $$;

CREATE OR REPLACE FUNCTION public.return_book(_book_id UUID)
RETURNS public.books LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.books;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.books
    SET available_copies = available_copies + 1,
        return_count = return_count + 1,
        last_activity_at = now()
    WHERE id = _book_id AND available_copies < total_copies
    RETURNING * INTO b;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cannot return: all copies already in library';
  END IF;
  RETURN b;
END; $$;

-- Storage bucket for covers
INSERT INTO storage.buckets (id, name, public) VALUES ('book-covers', 'book-covers', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read covers" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'book-covers');
CREATE POLICY "Admins upload covers" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'book-covers' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update covers" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'book-covers' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete covers" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'book-covers' AND public.has_role(auth.uid(), 'admin'));
