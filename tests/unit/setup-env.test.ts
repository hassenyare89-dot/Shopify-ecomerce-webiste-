import {describe, expect, it} from 'vitest';
import {parseEnv, setEnvValue} from '../../scripts/setup-env.mjs';

describe('setup-env helpers', () => {
  it('parses quoted, unquoted, empty and commented values', () => {
    const env = parseEnv('A="x"\nB=y # comment\nC=""\n# D=z\nE=\'q\'\r\n');
    expect(env.get('A')).toBe('x');
    expect(env.get('B')).toBe('y');
    expect(env.get('C')).toBe('');
    expect(env.has('D')).toBe(false);
    expect(env.get('E')).toBe('q');
  });
  it('treats a quoted empty value with an inline comment as empty', () => {
    expect(parseEnv('PRIVATE_STOREFRONT_API_TOKEN=""          # secret').get('PRIVATE_STOREFRONT_API_TOKEN')).toBe('');
    expect(parseEnv('K="v" # note').get('K')).toBe('v');
  });
  it('replaces an empty value in place without touching other lines', () => {
    const out = setEnvValue('X="1"\nSESSION_SECRET=""\nY="2"\n', 'SESSION_SECRET', 'abc');
    expect(out).toBe('X="1"\nSESSION_SECRET="abc"\nY="2"\n');
  });
  it('appends a missing key', () => {
    expect(setEnvValue('X="1"', 'SESSION_SECRET', 'abc')).toBe('X="1"\nSESSION_SECRET="abc"\n');
  });
});
