export type AppRole = 'ceo' | 'cto' | 'qa'

const ROLE_DEFAULT_PATH: Record<AppRole, string> = {
  ceo: '/',
  cto: '/cto',
  qa: '/qa',
}

export function isAppRole(role: string | null | undefined): role is AppRole {
  return role === 'ceo' || role === 'cto' || role === 'qa'
}

export function defaultPathForRole(role: string | null | undefined) {
  return isAppRole(role) ? ROLE_DEFAULT_PATH[role] : '/login'
}

export function canAccessRole(requiredRole: string | undefined, actualRole: string | null | undefined) {
  return !requiredRole || requiredRole === actualRole
}
