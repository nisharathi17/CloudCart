
'use client';

import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-3xl font-bold mb-6 text-center">
        CloudCart Login
      </h1>

      <Authenticator>
        {({ signOut, user }) => (
          <div className="space-y-4 text-center">
            <p>
              Signed in as{' '}
              <strong>
                {user?.signInDetails?.loginId ?? user?.username}
              </strong>
            </p>

            <button
              onClick={signOut}
              className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
            >
              Sign out
            </button>
          </div>
        )}
      </Authenticator>
    </div>
  );
}
