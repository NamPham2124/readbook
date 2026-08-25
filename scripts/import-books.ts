import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

function loadEnvFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnvFile(path.resolve(process.cwd(), '.env.local'));
loadEnvFile(path.resolve(process.cwd(), '.env'));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.');
  process.exit(1);
}

import ws from 'ws';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws as any },
});

const SUPPORTED_EXTS = new Set(['.pdf', '.epub', '.mobi', '.fb2', '.cbz']);

function getSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function cleanTitle(fileName: string): string {
  // Remove extension
  let title = path.basename(fileName, path.extname(fileName));
  // Clean up typical archive strings
  title = title.split(' -- ')[0] || title;
  title = title.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
  return title || fileName;
}

function getMimeType(ext: string): string {
  switch (ext.toLowerCase()) {
    case '.pdf':
      return 'application/pdf';
    case '.epub':
      return 'application/epub+zip';
    case '.mobi':
      return 'application/x-mobipocket-ebook';
    case '.fb2':
      return 'application/x-fictionbook+xml';
    case '.cbz':
      return 'application/vnd.comicbook+zip';
    default:
      return 'application/octet-stream';
  }
}

async function findAdminUserId(): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .eq('is_active', true)
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }
  return data[0].id;
}

function walkDir(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath, fileList);
    } else {
      const ext = path.extname(file).toLowerCase();
      if (SUPPORTED_EXTS.has(ext)) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

async function main() {
  const targetDir = process.argv[2] || path.resolve(process.cwd(), 'Book');
  console.log('📚 ReadBook Global Library Importer');
  console.log(`📂 Scanning directory: ${targetDir}`);

  if (!fs.existsSync(targetDir)) {
    console.error(`❌ Directory does not exist: ${targetDir}`);
    process.exit(1);
  }

  const adminId = await findAdminUserId();
  if (!adminId) {
    console.warn('⚠️ No active admin profile found. Run `npm run seed:admin` first to assign global books to admin.');
  }

  const files = walkDir(targetDir);
  console.log(`🔍 Found ${files.length} book file(s) to process.`);

  let importedCount = 0;
  let skippedCount = 0;

  for (const filePath of files) {
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const fileType = ext.replace('.', '');
    const relativePath = path.relative(targetDir, filePath);
    const parts = relativePath.split(path.sep);
    const category = parts.length > 1 ? parts[0] : 'General';
    const buffer = fs.readFileSync(filePath);
    const fileSize = buffer.length;
    const checksum = getSha256(buffer);
    const title = cleanTitle(fileName);

    console.log(`\n📖 Processing: [${category}] ${title} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)`);

    // 1. Check for duplicates in database
    const { data: existing, error: checkError } = await supabase
      .from('books')
      .select('id, title')
      .eq('checksum', checksum)
      .maybeSingle();

    if (existing) {
      console.log(`  ⏩ Skipped: Already exists in database (ID: ${existing.id})`);
      skippedCount++;
      continue;
    }

    // 2. Storage upload path: global/<category>/<sanitized_filename>
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `global/${category.toLowerCase()}/${safeFileName}`;
    const contentType = getMimeType(ext);

    console.log(`  ☁️ Uploading to Supabase Storage: ${storagePath}...`);
    const { error: uploadError } = await supabase.storage
      .from('books')
      .upload(storagePath, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error(`  ❌ Storage upload failed: ${uploadError.message}`);
      continue;
    }

    // 3. Insert database record
    const { error: dbError } = await supabase.from('books').insert({
      title,
      author: 'Unknown',
      description: `Global library book imported from ${category}`,
      file_name: fileName,
      file_path: storagePath,
      file_type: fileType as any,
      file_size: fileSize,
      checksum,
      category,
      cover_url: null,
      total_pages: 1, // Will be dynamically refined by web reader
      owner_id: adminId,
      is_global: true,
    });

    if (dbError) {
      console.error(`  ❌ Database insert failed: ${dbError.message}`);
      continue;
    }

    console.log(`  ✅ Successfully imported as Global Book!`);
    importedCount++;
  }

  console.log('\n==================================================');
  console.log(`🎉 Import Summary:`);
  console.log(`  ✅ Imported: ${importedCount}`);
  console.log(`  ⏩ Skipped (Duplicates): ${skippedCount}`);
  console.log(`  📦 Total scanned: ${files.length}`);
  console.log('==================================================');
}

main().catch((err) => {
  console.error('Fatal error during book import:', err);
  process.exit(1);
});
