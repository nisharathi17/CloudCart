import './globals.css';
import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'E-Commerce DBMS | PostgreSQL 3NF & Prisma ORM',
  description: 'Academic DBMS Project by Nisha Rathi (24BYB0137) & Anshul Gupta (24BYB0149)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 space-y-1">
            <p>
              Academic DBMS Capstone Project &bull; Built with <strong>PostgreSQL 3NF</strong>,{' '}
              <strong>PL/pgSQL Triggers</strong>, <strong>Prisma ORM</strong>, and <strong>Next.js</strong>.
            </p>
            <p className="text-slate-400">
              Developed by <strong>Nisha Rathi</strong> (24BYB0137) &amp; <strong>Anshul Gupta</strong> (24BYB0149)
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
