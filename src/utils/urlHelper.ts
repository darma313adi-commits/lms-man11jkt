/**
 * Helper untuk menangani URL Aplikasi dan tautan berbagi login.
 * 
 * CATATAN PENTING ARSITEKTUR GOOGLE CLOUD RUN / AI STUDIO:
 * 1. Development URL (ais-dev-...) diproteksi oleh Google IAP (Identity-Aware Proxy).
 *    Hanya akun Google pembuat (darma313adi@gmail.com) yang diizinkan membukanya.
 * 2. Shared App URL (ais-pre-...) adalah link preview publik.
 *    Bisa dibuka oleh siapa saja di akun Google mana pun, mode samaran (incognito),
 *    maupun HP/laptop siswa dan guru tanpa restriksi izin developer.
 */

export function getPublicBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  // Jika sedang berjalan di domain development, ubah otomatis prefix ke domain shared preview (ais-pre)
  if (origin.includes('ais-dev-')) {
    return origin.replace('ais-dev-', 'ais-pre-');
  }
  return origin;
}

export function getDevBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

export function isDevEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.origin.includes('ais-dev-');
}

export function buildLoginUrl(role?: string, username?: string, usePublic = true): string {
  if (typeof window === 'undefined') return '';
  const base = usePublic ? getPublicBaseUrl() : getDevBaseUrl();
  const path = window.location.pathname;
  const params = new URLSearchParams();
  if (role) params.set('role', role);
  if (username) params.set('user', username);
  const qs = params.toString();
  return `${base}${path}${qs ? `?${qs}` : ''}`;
}
