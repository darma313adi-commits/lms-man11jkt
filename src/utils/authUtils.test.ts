import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePasswordChange } from './authUtils';

test('validatePasswordChange should reject incorrect current password', () => {
  const result = validatePasswordChange('wrongpass', 'guru123', 'guruBaru2026', 'guruBaru2026');
  assert.equal(result.valid, false);
  assert.match(result.error || '', /tidak sesuai/i);
});

test('validatePasswordChange should reject new password shorter than 6 characters', () => {
  const result = validatePasswordChange('guru123', 'guru123', '12345', '12345');
  assert.equal(result.valid, false);
  assert.match(result.error || '', /minimal 6 karakter/i);
});

test('validatePasswordChange should reject identical new password as old password', () => {
  const result = validatePasswordChange('guru123', 'guru123', 'guru123', 'guru123');
  assert.equal(result.valid, false);
  assert.match(result.error || '', /tidak boleh sama/i);
});

test('validatePasswordChange should reject mismatched confirm password', () => {
  const result = validatePasswordChange('guru123', 'guru123', 'guruBaru2026', 'guruBaruLain');
  assert.equal(result.valid, false);
  assert.match(result.error || '', /tidak cocok/i);
});

test('validatePasswordChange should succeed with valid inputs', () => {
  const result = validatePasswordChange('guru123', 'guru123', 'guruBaru2026', 'guruBaru2026');
  assert.equal(result.valid, true);
  assert.equal(result.error, undefined);
});
