'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Database, ShoppingCart, XCircle, BarChart3, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [initLoading, setInitLoading] = useState(false);
  const [initMessage, setInitMessage] = useState<string | null>(null);

  const handleInitDb = async () => {
    if (!confirm('This will recreate tables, install triggers/procedures, and reseed initial data. Continue?')) return;
    setInitLoading(true);
    setInitMessage(null);
    try {
      const res = await fetch('/api/db/init', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setInitMessage('Database Initialized!');
        setTimeout(() => window.location.reload(), 1200);
      } else {
        alert('Init failed: ' + (data.details || data.error));
      }
    } catch (err: any) {
      alert('Init failed: ' + err.message);
    } finally {
      setInitLoading(false);
    }
  };

  const navLinks = [
    { href: '/', label: 'Dashboard & Inventory', icon: Database },
    { href: '/orders', label: 'Place Order (Triggers)', icon: ShoppingCart },
    { href: '/cancel-order', label: 'Cancel Order (Restoration)', icon: XCircle },
    { href: '/analytics', label: 'RFM Analytics & ML', icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Academic Info */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-500/20 border border-teal-500/40 rounded-lg text-teal-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <Link href="/" className="font-bold text-lg text-white hover:text-teal-400 transition-colors">
                E-Commerce DBMS
              </Link>
              <div className="text-xs text-slate-400 flex items-center space-x-2">
                <span>PostgreSQL 3NF + Prisma ORM</span>
                <span>•</span>
                <span className="text-teal-300 font-medium">Nisha Rathi (24BYB0137) & Anshul Gupta (24BYB0149)</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Quick 1-Click Init DB Button */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleInitDb}
              disabled={initLoading}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-teal-600 hover:bg-teal-500 text-white shadow transition-all disabled:opacity-50"
              title="Executes schema.sql, procedures_triggers.sql, and seed.sql"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${initLoading ? 'animate-spin' : ''}`} />
              <span>{initLoading ? 'Resetting DB...' : 'Reset & Seed DB'}</span>
            </button>
            {initMessage && (
              <span className="flex items-center text-xs text-green-400">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> {initMessage}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
