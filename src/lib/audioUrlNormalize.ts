import { absolutizeApiUrl } from '@/api/axios';

/** Relative /api/... URLs → full backend URL so audio/image work when SPA and API differ. */
export function normalizeApiMediaUrl(u: unknown): string | null {
  if (u == null || typeof u !== 'string' || !u.trim()) return null;
  const t = u.trim();
  if (t.startsWith('http') || t.startsWith('blob:')) return t;
  if (t.startsWith('/') && t.includes('/api/')) return absolutizeApiUrl(t) || t;
  return t;
}
