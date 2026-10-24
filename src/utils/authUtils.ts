export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
  message?: string;
}

export function validatePasswordChange(
  currentPasswordInput: string,
  userActualPassword: string,
  newPassword: string,
  confirmPassword?: string
): PasswordValidationResult {
  const trimmedCurrent = currentPasswordInput.trim();
  const trimmedNew = newPassword.trim();

  if (!trimmedCurrent) {
    const msg = 'Kata sandi saat ini wajib diisi.';
    return { valid: false, error: msg, message: msg };
  }

  if (trimmedCurrent !== userActualPassword) {
    const msg = 'Kata sandi saat ini (lama) tidak sesuai.';
    return { valid: false, error: msg, message: msg };
  }

  if (!trimmedNew) {
    const msg = 'Kata sandi baru wajib diisi.';
    return { valid: false, error: msg, message: msg };
  }

  if (trimmedNew.length < 6) {
    const msg = 'Kata sandi baru minimal 6 karakter.';
    return { valid: false, error: msg, message: msg };
  }

  if (trimmedNew === userActualPassword) {
    const msg = 'Kata sandi baru tidak boleh sama dengan kata sandi lama.';
    return { valid: false, error: msg, message: msg };
  }

  if (confirmPassword !== undefined && trimmedNew !== confirmPassword.trim()) {
    const msg = 'Konfirmasi kata sandi baru tidak cocok.';
    return { valid: false, error: msg, message: msg };
  }

  return { valid: true, message: 'Validasi berhasil.' };
}
