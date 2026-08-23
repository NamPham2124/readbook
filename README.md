# ReadBook Web 📖☁️

A modern, cloud-native web application for reading **PDF** and **EPUB** books with non-destructive annotations, per-page markdown notes, color highlights, bookmarks, and automated reading progress synchronization.

Designed for serverless deployment on **Vercel** backed by **Next.js App Router**, **TypeScript**, **Tailwind CSS (Catppuccin Mocha Dark theme)**, and **Supabase (Auth, PostgreSQL with RLS, Object Storage)**.

---

## 🌟 Key Features

- **Multi-User Cloud Library:**
  - **Global Library:** Sourced from admin/system books (visible to all authenticated users).
  - **My Books:** Private book collection for individual user uploads.
  - **Continue Reading:** Quick resume with real-time reading progress indicators.
- **Non-Destructive Web Reader:**
  - **PDF Reader (`pdfjs-dist`):** High-resolution canvas rendering, selectable text layer, rotation, zoom (fit width/page), text search, and 5-color highlight overlays.
  - **EPUB Reader (`epubjs`):** Responsive reflow reader with dark theme styling and chapter navigation.
  - **Zero file mutation:** Slices, notes, and highlights are stored independently in PostgreSQL without modifying original files.
- **Rich Annotations:**
  - **Per-page Notes:** Markdown notes with real-time autosave.
  - **Text Highlights:** 5 Catppuccin color palettes with optional note attachments.
  - **Bookmarks & Tags:** Custom tags and bookmarks with one-click page navigation.
- **Admin Management Portal (`/admin`):**
  - System statistics (users, books, global storage, annotations).
  - User management (role promotion, enable/disable accounts, deletion).
  - Global book publishing and management.
- **Production Security:**
  - Strict Row Level Security (RLS) on all PostgreSQL tables.
  - Server-side authorization and session validation in middleware and route handlers.
  - Private Supabase Storage bucket with signed download URLs.

---

## 🏗️ Architecture & Stack

```text
┌─────────────────────────────────────────────────────────────┐
│                      Next.js 14 Web App                     │
│  React 18 • TypeScript • Tailwind CSS • Catppuccin Mocha    │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
    ┌──────────────────────┐      ┌──────────────────────┐
    │     Supabase Auth    │      │  Supabase PostgreSQL │
    │  Sessions & Cookies  │      │ Row Level Security   │
    └──────────────────────┘      └──────────┬───────────┘
                                             │
                                             ▼
                                  ┌──────────────────────┐
                                  │   Supabase Storage   │
                                  │ Private Bucket: books│
                                  └──────────────────────┘
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: v18+ or v20+ LTS
- **npm** or **pnpm**
- A **Supabase** project (free tier available at [supabase.com](https://supabase.com))

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your Supabase project credentials in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Admin credentials for seeding
ADMIN_EMAIL=admin@readbook.local
ADMIN_PASSWORD=admin123456!

NEXT_PUBLIC_APP_NAME=ReadBook
MAX_BOOK_SIZE_MB=200
```

---

## 🗄️ Database & Storage Setup (Supabase)

Execute the SQL migrations in your **Supabase SQL Editor** in numerical order:

1. `supabase/migrations/001_initial_schema.sql` (Creates `profiles`, `books`, `notes`, `highlights`, `bookmarks`, `tags`, `reading_progress`)
2. `supabase/migrations/002_storage.sql` (Creates private `books` storage bucket and storage RLS)
3. `supabase/migrations/003_rls_policies.sql` (Enables strict Row Level Security policies)
4. `supabase/migrations/004_triggers.sql` (Automated user profile generation on signup)

---

## 👑 Seed Admin & Import Books

### 1. Create or Promote Admin Account
Run the automated admin seed script:

```bash
npm run seed:admin
```

This creates or promotes `ADMIN_EMAIL` to the `admin` role with active status.

### 2. Import Local Books (`./Book` or `~/Book`)
To import local books into the Supabase Global Library:

```bash
npm run import:books
# Or specify a custom directory:
npm run import:books /path/to/books
```

The script will:
- Recursively scan for `.pdf` and `.epub` files.
- Compute **SHA-256 checksums** to prevent duplicate uploads.
- Upload binaries to Supabase Storage (`global/<category>/...`).
- Create global database records assigned to the admin user.

---

## 🧪 Running Tests & Building

### Run Automated Test Suite
```bash
npm run test
```

Runs 18 unit & integration tests covering:
- Authentication & password rules
- Multi-user isolation & RLS access control
- Format & size validation
- SHA-256 duplicate checksum detection
- Reader progress calculation and page clamping
- Admin self-protection and permissions

### Production Build
```bash
npm run build
```

---

## ☁️ Deploying to Vercel

### Option 1: Vercel CLI
```bash
npm install -g vercel
vercel
```

### Option 2: GitHub Integration
1. Push this repository to GitHub.
2. Import the project in the [Vercel Dashboard](https://vercel.com/new).
3. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `MAX_BOOK_SIZE_MB`
4. Click **Deploy**.

---

## 📁 Repository Structure

```text
App_readbook/
├── Book/                             # Local book library for import
├── desktop/                          # Preserved Python/PySide6 desktop code
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql    # Core tables schema
│       ├── 002_storage.sql           # Storage bucket & security policies
│       ├── 003_rls_policies.sql      # Database Row Level Security (RLS)
│       └── 004_triggers.sql          # Auto profile creation & timestamps
├── scripts/
│   ├── seed-admin.ts                 # Script to create/promote admin account
│   └── import-books.ts               # Script to import local books to cloud
├── src/
│   ├── app/
│   │   ├── (auth)/                   # /login, /register, /forgot-password, /reset-password
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx            # Authenticated layout with Navbar
│   │   │   ├── library/page.tsx      # Main Library UI (Grid, List, Search, Filter)
│   │   │   └── reader/[id]/page.tsx  # Immersive Web Reader (PDF & EPUB)
│   │   ├── admin/                    # /admin overview, /users, /books, /settings
│   │   ├── api/                      # Next.js Serverless Route Handlers
│   │   ├── globals.css               # Catppuccin Mocha theme & scrollbar styles
│   │   └── layout.tsx                # Root layout with Toast provider
│   ├── components/
│   │   ├── ui/                       # Button, Input, Modal, Badge, Skeleton, ConfirmModal
│   │   ├── auth/                     # AuthCard
│   │   ├── library/                  # BookCard, BookListItem, UploadBookModal, LibraryHeader
│   │   └── reader/                   # PdfViewer, EpubViewer, TOC, Notes, Highlights, Tags
│   ├── lib/
│   │   ├── supabase/                 # Browser, Server, Admin, and Middleware clients
│   │   ├── types/                    # TypeScript interfaces & database schemas
│   │   └── constants.ts              # Theme colors, limits, categories
│   └── middleware.ts                 # Session refresh & route protection guard
├── tests/                            # Vitest test suite (18 test cases)
├── .env.example                      # Template for environment variables
├── package.json                      # Next.js dependencies and scripts
└── tsconfig.json                     # TypeScript configuration
```
