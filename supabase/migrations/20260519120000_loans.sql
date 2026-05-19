-- Loans: one row per borrow event. returned_at is set when the copy comes back.
-- Optional student fields are captured at the desk; nothing is required.

CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  student_number TEXT,
  first_name TEXT,
  last_name TEXT,
  borrowed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  returned_at TIMESTAMPTZ,
  borrowed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  returned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT loans_returned_after_borrowed CHECK (returned_at IS NULL OR returned_at >= borrowed_at)
);

CREATE INDEX loans_book_id_idx ON public.loans(book_id);
CREATE INDEX loans_open_idx ON public.loans(book_id, borrowed_at) WHERE returned_at IS NULL;
CREATE INDEX loans_student_idx ON public.loans(student_number) WHERE student_number IS NOT NULL;

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- Admins can read loan history. Writes only via SECURITY DEFINER RPCs below.
CREATE POLICY "Admins read loans" ON public.loans FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- borrow_book: replace the single-arg version with one that accepts optional student fields
-- and writes a loan row alongside the counter update.
DROP FUNCTION IF EXISTS public.borrow_book(UUID);

CREATE OR REPLACE FUNCTION public.borrow_book(
  _book_id UUID,
  _student_number TEXT DEFAULT NULL,
  _first_name TEXT DEFAULT NULL,
  _last_name TEXT DEFAULT NULL
)
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

  INSERT INTO public.loans (book_id, student_number, first_name, last_name, borrowed_by)
  VALUES (
    _book_id,
    NULLIF(BTRIM(_student_number), ''),
    NULLIF(BTRIM(_first_name), ''),
    NULLIF(BTRIM(_last_name), ''),
    auth.uid()
  );

  RETURN b;
END; $$;

GRANT EXECUTE ON FUNCTION public.borrow_book(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- return_book: closes the matching open loan (or oldest open loan as FIFO fallback)
-- and updates the counter. Optional student fields help disambiguate when multiple
-- copies of the same title are out concurrently.
DROP FUNCTION IF EXISTS public.return_book(UUID);

CREATE OR REPLACE FUNCTION public.return_book(
  _book_id UUID,
  _student_number TEXT DEFAULT NULL,
  _first_name TEXT DEFAULT NULL,
  _last_name TEXT DEFAULT NULL
)
RETURNS public.books LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  b public.books;
  matched_loan UUID;
  sn TEXT := NULLIF(BTRIM(_student_number), '');
  fn TEXT := NULLIF(BTRIM(_first_name), '');
  ln TEXT := NULLIF(BTRIM(_last_name), '');
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

  -- Try to match an open loan with the strongest available identifier.
  IF sn IS NOT NULL THEN
    SELECT id INTO matched_loan FROM public.loans
      WHERE book_id = _book_id AND returned_at IS NULL AND student_number = sn
      ORDER BY borrowed_at ASC LIMIT 1;
  END IF;
  IF matched_loan IS NULL AND (fn IS NOT NULL OR ln IS NOT NULL) THEN
    SELECT id INTO matched_loan FROM public.loans
      WHERE book_id = _book_id AND returned_at IS NULL
        AND (fn IS NULL OR first_name = fn)
        AND (ln IS NULL OR last_name = ln)
      ORDER BY borrowed_at ASC LIMIT 1;
  END IF;
  IF matched_loan IS NULL THEN
    SELECT id INTO matched_loan FROM public.loans
      WHERE book_id = _book_id AND returned_at IS NULL
      ORDER BY borrowed_at ASC LIMIT 1;
  END IF;

  IF matched_loan IS NOT NULL THEN
    UPDATE public.loans
      SET returned_at = now(),
          returned_by = auth.uid()
      WHERE id = matched_loan;
  END IF;

  RETURN b;
END; $$;

GRANT EXECUTE ON FUNCTION public.return_book(UUID, TEXT, TEXT, TEXT) TO authenticated;
