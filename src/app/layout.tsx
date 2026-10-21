
import './globals.css';
import type { Metadata } from 'next';
import { Bricolage_Grotesque } from 'next/font/google';
import Navbar from '@/components/Navbar';
import AuthProvider from '@/components/AuthProvider';

const sans = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CloudCart',
  description: 'Academic DBMS Capstone Project',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="bg-paper text-ink font-sans antialiased flex flex-col min-h-screen">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {children}
          </main>
          <footer className="border-t border-line py-6 text-center text-sm text-ink-soft">
            <div className="max-w-6xl mx-auto px-4">
              <p>
                CloudCart is a student project built with PostgreSQL, Prisma and Next.js, running on AWS.
              </p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
