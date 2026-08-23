import { describe, it, expect } from 'vitest';
import { SUPPORTED_EXTENSIONS, MAX_BOOK_SIZE_BYTES } from '@/lib/constants';
import * as crypto from 'crypto';

describe('Book Upload & Validation Logic', () => {
  it('accepts valid ebook extensions (.pdf, .epub, .mobi, .fb2, .cbz)', () => {
    const validFiles = ['book.pdf', 'novel.epub', 'comic.cbz', 'document.FB2'];
    validFiles.forEach((file) => {
      const ext = (file.substring(file.lastIndexOf('.')).toLowerCase() as any);
      expect(SUPPORTED_EXTENSIONS.includes(ext)).toBe(true);
    });
  });

  it('rejects unsupported extensions (.exe, .zip, .txt, .docx)', () => {
    const invalidFiles = ['malware.exe', 'archive.zip', 'text.txt', 'paper.docx'];
    invalidFiles.forEach((file) => {
      const ext = (file.substring(file.lastIndexOf('.')).toLowerCase() as any);
      expect(SUPPORTED_EXTENSIONS.includes(ext)).toBe(false);
    });
  });

  it('enforces maximum book size limit', () => {
    const validSize = 50 * 1024 * 1024; // 50MB
    const oversized = 300 * 1024 * 1024; // 300MB

    expect(validSize <= MAX_BOOK_SIZE_BYTES).toBe(true);
    expect(oversized <= MAX_BOOK_SIZE_BYTES).toBe(false);
  });

  it('detects duplicate files by SHA-256 checksum', () => {
    const bufferA = Buffer.from('PDF file content sample');
    const bufferB = Buffer.from('PDF file content sample');
    const bufferC = Buffer.from('Different PDF content');

    const hashA = crypto.createHash('sha256').update(bufferA).digest('hex');
    const hashB = crypto.createHash('sha256').update(bufferB).digest('hex');
    const hashC = crypto.createHash('sha256').update(bufferC).digest('hex');

    expect(hashA).toBe(hashB);
    expect(hashA).not.toBe(hashC);
  });
});
