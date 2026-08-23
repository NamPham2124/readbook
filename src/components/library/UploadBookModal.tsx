'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { UploadCloud, File, X, CheckCircle, Globe } from 'lucide-react';
import { DEFAULT_CATEGORIES, MAX_BOOK_SIZE_BYTES, MAX_BOOK_SIZE_MB, SUPPORTED_EXTENSIONS } from '@/lib/constants';
import { formatBytes } from '@/lib/utils/cn';
import { toast } from 'sonner';

interface UploadBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  onSuccess: () => void;
}

export function UploadBookModal({ isOpen, onClose, isAdmin = false, onSuccess }: UploadBookModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState<string>('General');
  const [customCategory, setCustomCategory] = useState('');
  const [isGlobal, setIsGlobal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.size > MAX_BOOK_SIZE_BYTES) {
        toast.error(`File is too large! Maximum limit is ${MAX_BOOK_SIZE_MB} MB.`);
        return;
      }
      setSelectedFile(file);
      // Auto populate title from file name
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setTitle(nameWithoutExt);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'application/epub+zip': ['.epub'],
      'application/x-mobipocket-ebook': ['.mobi'],
      'application/x-fictionbook+xml': ['.fb2'],
      'application/vnd.comicbook+zip': ['.cbz'],
    },
  });

  const resetForm = () => {
    setSelectedFile(null);
    setTitle('');
    setAuthor('');
    setCategory('General');
    setCustomCategory('');
    setIsGlobal(false);
    setIsUploading(false);
    setUploadProgress(0);
  };

  const handleClose = () => {
    if (!isUploading) {
      resetForm();
      onClose();
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a book file.');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a book title.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', title.trim());
      formData.append('author', author.trim() || 'Unknown');
      formData.append('category', category === 'Custom' ? customCategory.trim() || 'General' : category);
      formData.append('is_global', isGlobal ? 'true' : 'false');

      setUploadProgress(50);

      const res = await fetch('/api/books', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(90);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadProgress(100);
      toast.success(`"${title}" uploaded successfully!`);
      resetForm();
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload book.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload Book"
      description={`Add a PDF or EPUB book to your library (Max: ${MAX_BOOK_SIZE_MB}MB)`}
      maxWidth="lg"
    >
      <form onSubmit={handleUpload} className="space-y-4">
        {/* Dropzone Area */}
        {!selectedFile ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-center space-y-3 ${
              isDragActive
                ? 'border-mocha-blue bg-mocha-blue/10 scale-[1.01]'
                : 'border-mocha-surface1 hover:border-mocha-blue/50 hover:bg-mocha-surface0/50 bg-mocha-surface0/20'
            }`}
          >
            <input {...getInputProps()} />
            <div className="w-12 h-12 rounded-full bg-mocha-surface0 flex items-center justify-center text-mocha-blue">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-mocha-text">
                Drag & drop your book here, or <span className="text-mocha-blue underline">browse</span>
              </p>
              <p className="text-xs text-mocha-overlay1">
                Supports {SUPPORTED_EXTENSIONS.join(', ')}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3.5 bg-mocha-surface0/80 border border-mocha-surface1 rounded-xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-mocha-blue/15 text-mocha-blue flex items-center justify-center shrink-0">
                <File className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-mocha-text truncate">{selectedFile.name}</p>
                <p className="text-[11px] text-mocha-subtext0">{formatBytes(selectedFile.size)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              disabled={isUploading}
              className="text-mocha-overlay0 hover:text-mocha-red p-1 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Book Metadata Fields */}
        <Input
          label="Book Title"
          placeholder="e.g. Clean Code: A Handbook of Agile Software Craftsmanship"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <Input
          label="Author (Optional)"
          placeholder="e.g. Robert C. Martin"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        />

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-mocha-subtext0">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-mocha-surface0/70 border border-mocha-surface1 text-mocha-text text-sm rounded-lg px-3.5 py-2 focus:outline-none focus:border-mocha-blue"
          >
            {DEFAULT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
            <option value="Custom">+ Custom Category</option>
          </select>
        </div>

        {category === 'Custom' && (
          <Input
            label="New Category Name"
            placeholder="e.g. Distributed Systems"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            required
          />
        )}

        {/* Global Library Checkbox for Admins */}
        {isAdmin && (
          <div className="p-3 bg-mocha-mauve/10 border border-mocha-mauve/20 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-mocha-mauve flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Publish to Global Library
              </span>
              <p className="text-[11px] text-mocha-subtext0">
                If checked, all registered users will be able to read this book.
              </p>
            </div>
            <input
              type="checkbox"
              checked={isGlobal}
              onChange={(e) => setIsGlobal(e.target.checked)}
              className="w-4 h-4 rounded border-mocha-surface1 text-mocha-mauve focus:ring-mocha-mauve bg-mocha-surface0"
            />
          </div>
        )}

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs text-mocha-subtext0 font-medium">
              <span>Uploading to cloud storage...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-mocha-surface1 rounded-full overflow-hidden">
              <div
                className="h-full bg-mocha-blue transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-mocha-surface0">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!selectedFile || isUploading}
            isLoading={isUploading}
            className="gap-2"
          >
            <UploadCloud className="w-4 h-4" /> Upload Book
          </Button>
        </div>
      </form>
    </Modal>
  );
}
