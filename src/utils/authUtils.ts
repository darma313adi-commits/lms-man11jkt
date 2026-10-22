export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
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
    return { valid: false, error: 'Kata sandi saat ini wajib diisi.' };
  }

  if (trimmedCurrent !== userActualPassword) {
    return { valid: false, error: 'Kata sandi saat ini (lama) tidak sesuai.' };
  }

  if (!trimmedNew) {
    return { valid: false, error: 'Kata sandi baru wajib diisi.' };
  }

  if (trimmedNew.length < 6) {
    return { valid: false, error: 'Kata sandi baru minimal 6 karakter.' };
  }

  if (trimmedNew === userActualPassword) {
    return { valid: false, error: 'Kata sandi baru tidak boleh sama dengan kata sandi lama.' };
  }

  if (confirmPassword !== undefined && trimmedNew !== confirmPassword.trim()) {
    return { valid: false, error: 'Konfirmasi kata sandi baru tidak cocok.' };
  }

  return { valid: true };
}
