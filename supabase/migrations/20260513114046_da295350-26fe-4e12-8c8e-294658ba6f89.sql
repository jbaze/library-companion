
ALTER FUNCTION public.set_updated_at() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.borrow_book(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.return_book(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.borrow_book(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_book(UUID) TO authenticated;

DROP POLICY IF EXISTS "Public read covers" ON storage.objects;
