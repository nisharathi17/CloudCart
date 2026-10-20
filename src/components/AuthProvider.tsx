
'use client';

import { configureAuth } from '@/lib/auth-config';

let configured = false;

function initializeAuth() {
  if (!configured) {
    configureAuth();
    configured = true;
  }
}

initializeAuth();

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
