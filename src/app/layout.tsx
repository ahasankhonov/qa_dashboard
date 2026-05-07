import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'QA Dashboard — Playwright Automation',
  description: 'Monitor and trigger GitHub Actions test workflows for Playwright automation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full dark">
      <body className="min-h-full bg-zinc-950 text-zinc-100 antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: '#18181b',
              border: '1px solid #27272a',
              color: '#fafafa',
            },
          }}
        />
      </body>
    </html>
  );
}
