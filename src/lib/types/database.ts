export type UserRole = 'admin' | 'user';

export type BookFileType = 'pdf' | 'epub' | 'mobi' | 'fb2' | 'cbz';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  file_name: string;
  file_path: string;
  file_type: BookFileType;
  file_size: number;
  checksum: string | null;
  category: string;
  cover_url: string | null;
  total_pages: number;
  owner_id: string | null;
  is_global: boolean;
  created_at: string;
  updated_at: string;
  // Computed / joined fields
  owner_email?: string | null;
  progress?: ReadingProgress | null;
}

export interface BookAccess {
  id: string;
  book_id: string;
  user_id: string;
  granted_by: string | null;
  created_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  book_id: string;
  page_number: number;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface HighlightRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface Highlight {
  id: string;
  user_id: string;
  book_id: string;
  page_number: number;
  selected_text: string;
  rectangles: HighlightRect[];
  color: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  book_id: string;
  page_number: number;
  label: string | null;
  created_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface BookTag {
  book_id: string;
  tag_id: string;
  user_id: string;
  page_number: number;
  created_at: string;
  tag?: Tag;
}

export interface ReadingProgress {
  id: string;
  user_id: string;
  book_id: string;
  page_number: number;
  progress: number;
  updated_at: string;
}

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; email: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      books: {
        Row: Book;
        Insert: Omit<Book, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Book>;
        Relationships: [];
      };
      notes: {
        Row: Note;
        Insert: Omit<Note, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Note>;
        Relationships: [];
      };
      highlights: {
        Row: Highlight;
        Insert: Omit<Highlight, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Highlight>;
        Relationships: [];
      };
      bookmarks: {
        Row: Bookmark;
        Insert: Omit<Bookmark, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Bookmark>;
        Relationships: [];
      };
      tags: {
        Row: Tag;
        Insert: Omit<Tag, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Tag>;
        Relationships: [];
      };
      book_tags: {
        Row: BookTag;
        Insert: BookTag;
        Update: Partial<BookTag>;
        Relationships: [];
      };
      reading_progress: {
        Row: ReadingProgress;
        Insert: Omit<ReadingProgress, 'id' | 'updated_at'> & { id?: string };
        Update: Partial<ReadingProgress>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
