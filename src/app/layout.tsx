import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'ReadBook — Personal Cloud Book Reader',
  description: 'A modern, high-performance web application for reading PDF & EPUB books with non-destructive annotations, highlights, notes, and progress tracking.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-mocha-base text-mocha-text antialiased selection:bg-mocha-blue/30 selection:text-white">
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: '#181825',
              borderColor: '#313244',
              color: '#cdd6f4',
            },
          }}
        />
      </body>
    </html>
  );
}
