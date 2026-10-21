'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
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
    { href: '/', label: 'Inventory' },
    { href: '/orders', label: 'Place order' },
    { href: '/cancel-order', label: 'Cancel order' },
    { href: '/analytics', label: 'Customer spend' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-peach-200 text-peach-700">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <Link href="/" className="text-xl font-bold text-ink">
              CloudCart
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    isActive
                      ? 'bg-peach-200 text-peach-700 font-semibold'
                      : 'text-ink-soft hover:bg-peach-50'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Login / Sign out */}
          <div className="flex items-center gap-3">
            {userEmail ? (
              <>
                <span className="hidden lg:inline text-sm text-ink-soft">{userEmail}</span>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-ink-soft hover:text-ink transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="px-4 py-1.5 text-sm font-semibold rounded-full bg-sky-200 text-sky-700 hover:bg-sky-100 transition-colors"
              >
                Log in
              </Link>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="md:hidden flex items-center gap-1 overflow-x-auto pb-3 -mt-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`shrink-0 px-3 py-1.5 rounded-full text-sm transition-colors ${
                  isActive
                    ? 'bg-peach-200 text-peach-700 font-semibold'
                    : 'text-ink-soft hover:bg-peach-50'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
