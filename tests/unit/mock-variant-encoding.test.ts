import {describe, expect, it} from 'vitest';
import {decodeEncodedVariant} from '@shopify/hydrogen';
import {encodeVariants} from '../../mock/fixtures.mjs';

/** The mock API must emit encodings Hydrogen's real decoder understands. */
describe('mock encodedVariantExistence', () => {
  it.each([
    [[[0], [1], [2]], 1],
    [[[0, 0], [0, 1], [1, 1], [2, 0]], 2],
    [[[0, 0, 0], [0, 1, 0], [0, 1, 1], [1, 0, 0], [1, 0, 1], [1, 1, 1], [2, 0, 1], [2, 1, 0]], 3],
  ])('round-trips %j', (combos, optionCount) => {
    const encoded = encodeVariants(combos, optionCount);
    expect(encoded.startsWith('v1_')).toBe(true);
    expect(decodeEncodedVariant(encoded)).toEqual(combos);
  });
});
