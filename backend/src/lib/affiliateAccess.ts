import type { AuthPayload } from './authRequest';

export function canViewTeam(role: string): boolean {
  return role === 'admin' || role === 'manager';
}

export function canManageNetworks(role: string): boolean {
  return role === 'admin';
}

export function canViewAccountCredentials(
  authUser: AuthPayload,
  ownerId: number
): boolean {
  if (authUser.role === 'admin' || authUser.role === 'manager') return true;
  return authUser.id === ownerId;
}

export function parseScope(url: string): 'mine' | 'team' {
  const scope = new URL(url).searchParams.get('scope');
  return scope === 'team' ? 'team' : 'mine';
}

export function accountOwnerFilter(authUser: AuthPayload, scope: 'mine' | 'team') {
  if (scope === 'team' && canViewTeam(authUser.role)) return undefined;
  return { ownerId: authUser.id };
}

export function revenueAccountFilter(authUser: AuthPayload, scope: 'mine' | 'team') {
  if (scope === 'team' && canViewTeam(authUser.role)) return undefined;
  return { account: { ownerId: authUser.id } };
}
