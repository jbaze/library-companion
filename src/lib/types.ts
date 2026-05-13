export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  description: string | null;
  cover_url: string | null;
  total_copies: number;
  available_copies: number;
  archived: boolean;
  borrow_count: number;
  return_count: number;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
}
