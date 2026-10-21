import { fetchAuthSession } from 'aws-amplify/auth';

export async function authHeaders(): Promise<Record<string, string>> {
  try {
    const session = await fetchAuthSession();
    const accessToken = session.tokens?.accessToken?.toString();
    const idToken = session.tokens?.idToken?.toString();
    return accessToken && idToken
      ? { Authorization: `Bearer ${accessToken}`, 'x-id-token': idToken }
      : {};
  } catch {
    return {};
  }
}
