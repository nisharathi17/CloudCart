'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Database, ShoppingCart, XCircle, BarChart3, LogIn, LogOut } from 'lucide-react';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

export default function Navbar() {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Find out who is signed in, and update whenever someone signs in or out
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getCurrentUser();
        setUserEmail(user.signInDetails?.loginId ?? user.username);
      } catch {
        setUserEmail(null); // nobody is signed in
      }
    };

    loadUser();

    const stopListening = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedIn' || payload.event === 'signedOut') {
        loadUser();
      }
    });

    return stopListening;
  }, []);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  const navLinks = [
    { href: '/', label: 'Dashboard & Inventory', icon: Database },
    { href: '/orders', label: 'Place Order (Triggers)', icon: ShoppingCart },
    { href: '/cancel-order', label: 'Cancel Order (Restoration)', icon: XCircle },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-500/20 border border-teal-500/40 rounded-lg text-teal-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <Link href="/" className="font-bold text-lg text-white hover:text-teal-400 transition-colors">
                E-Commerce DBMS
              </Link>
              <div className="text-xs text-slate-400">
                <span>PostgreSQL 3NF + Prisma ORM</span>
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

          {/* Login / Sign out */}
          <div className="flex items-center space-x-3">
            {userEmail ? (
              <>
                <span className="hidden lg:inline text-xs text-slate-400">{userEmail}</span>
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-700 hover:bg-slate-600 text-white shadow transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-teal-600 hover:bg-teal-500 text-white shadow transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}