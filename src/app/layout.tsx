import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'ReadBook — Smart Cloud Book Reader',
  description:
    'A modern, high-performance web application for reading PDF & EPUB books with instant translations, IPA phonetics, non-destructive annotations, highlights, notes, and vocabulary tracking.',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" data-theme="mocha">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
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
