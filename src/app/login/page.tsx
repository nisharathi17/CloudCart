
'use client';

import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto py-12">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold tracking-tight text-ink">Log in to CloudCart</h1>
        <p className="mt-1 text-ink-soft">
          New here? Choose Create Account and we'll email you a code.
        </p>
      </div>

      <Authenticator>
        {({ signOut, user }) => (
          <div className="p-6 rounded-3xl border border-line bg-card text-center space-y-4">
            <p className="text-ink">
              You're logged in as <strong>{user?.signInDetails?.loginId ?? user?.username}</strong>.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link
                href="/orders"
                className="px-4 py-2 rounded-full bg-peach-200 text-peach-700 hover:bg-peach-100 font-semibold text-sm transition-colors"
              >
                Place an order
              </Link>
              <button
                onClick={signOut}
                className="text-sm text-ink-soft hover:text-ink transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </Authenticator>
    </div>
  );
}
