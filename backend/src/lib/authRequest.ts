import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'entdash-super-secret-key';

export interface AuthPayload {
  id: number;
  role: string;
  name: string;
  email: string;
  status?: string;
}

export function verifyAuthToken(token: string | null | undefined): AuthPayload | null {
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET_KEY) as AuthPayload;
  } catch {
    return null;
  }
}

export function getAuthUser(request: Request): AuthPayload | null {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyAuthToken(auth.slice(7));
}
