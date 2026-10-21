
import './globals.css';
import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import AuthProvider from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'E-Commerce DBMS | PostgreSQL 3NF & Prisma ORM',
  description: 'Academic DBMS Capstone Project',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 flex flex-col min-h-screen">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 space-y-1">
              <p>
                Academic DBMS Capstone Project &bull; Built with{' '}
                <strong>PostgreSQL 3NF</strong>,{' '}
                <strong>PL/pgSQL Triggers</strong>,{' '}
                <strong>Prisma ORM</strong>, and <strong>Next.js</strong>.
              </p>
              
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
