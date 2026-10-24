import { test } from 'node:test';
import assert from 'node:assert';
import { getPublicBaseUrl, isDevEnvironment, buildLoginUrl } from './urlHelper';

test('urlHelper: should convert ais-dev domain to ais-pre domain for public access', () => {
  // Mock window.location
  (global as any).window = {
    location: {
      origin: 'https://ais-dev-qxv52tf4ojyvuyhwdnn3zn-454083593677.asia-southeast1.run.app',
      pathname: '/',
    },
  };

  assert.strictEqual(isDevEnvironment(), true);
  assert.strictEqual(
    getPublicBaseUrl(),
    'https://ais-pre-qxv52tf4ojyvuyhwdnn3zn-454083593677.asia-southeast1.run.app'
  );

  const publicGuruLink = buildLoginUrl('guru', 'guru_bambang', true);
  assert.strictEqual(
    publicGuruLink,
    'https://ais-pre-qxv52tf4ojyvuyhwdnn3zn-454083593677.asia-southeast1.run.app/?role=guru&user=guru_bambang'
  );

  const devGuruLink = buildLoginUrl('guru', 'guru_bambang', false);
  assert.strictEqual(
    devGuruLink,
    'https://ais-dev-qxv52tf4ojyvuyhwdnn3zn-454083593677.asia-southeast1.run.app/?role=guru&user=guru_bambang'
  );
});

test('urlHelper: should keep standard origin if not ais-dev', () => {
  (global as any).window = {
    location: {
      origin: 'https://lms.man11jakarta.sch.id',
      pathname: '/',
    },
  };

  assert.strictEqual(isDevEnvironment(), false);
  assert.strictEqual(getPublicBaseUrl(), 'https://lms.man11jakarta.sch.id');
  assert.strictEqual(
    buildLoginUrl('siswa', 'siswa_budi', true),
    'https://lms.man11jakarta.sch.id/?role=siswa&user=siswa_budi'
  );
});
