
import { NextRequest } from 'next/server';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!;
const clientId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID!;

const accessTokenVerifier = CognitoJwtVerifier.create({
  userPoolId,
  tokenUse: 'access',
  clientId,
});

const idTokenVerifier = CognitoJwtVerifier.create({
  userPoolId,
  tokenUse: 'id',
  clientId,
});

export type AuthenticatedUser = {
  sub: string;
  username?: string;
  email?: string;
  email_verified?: boolean;
  groups: string[];
};

export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  const authorization = request.headers.get('authorization');
  const idToken = request.headers.get('x-id-token');

  if (!authorization?.startsWith('Bearer ') || !idToken) {
    return null;
  }

  try {
    const accessPayload = await accessTokenVerifier.verify(
      authorization.slice(7).trim()
    );

    const idPayload = await idTokenVerifier.verify(idToken);

    if (accessPayload.sub !== idPayload.sub) {
      return null;
    }

    const groups = accessPayload['cognito:groups'];

    return {
      sub: accessPayload.sub,
      username:
        typeof idPayload['cognito:username'] === 'string'
          ? idPayload['cognito:username']
          : undefined,
      email:
        typeof idPayload.email === 'string'
          ? idPayload.email
          : undefined,
      email_verified: idPayload.email_verified === true,
      groups: Array.isArray(groups)
        ? groups.filter(
            (group): group is string => typeof group === 'string'
          )
        : [],
    };
  } catch {
    return null;
  }
}
