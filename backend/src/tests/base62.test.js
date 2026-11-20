const { encode, decode, generateRandomShortCode, isReservedAlias, RESERVED_ALIASES } = require('../utils/base62');

describe('Base62 Encoding and Decoding', () => {
  it('should encode 0 correctly', () => {
    expect(encode(0)).toBe('0');
    expect(encode(0n)).toBe('0');
  });

  it('should encode small numbers accurately', () => {
    expect(encode(1)).toBe('1');
    expect(encode(61)).toBe('z');
    expect(encode(62)).toBe('10');
  });

  it('should decode Base62 characters accurately', () => {
    expect(decode('0')).toBe(0n);
    expect(decode('z')).toBe(61n);
    expect(decode('10')).toBe(62n);
  });

  it('should maintain round-trip mathematical fidelity for large numbers', () => {
    const testCases = [
      42n,
      1000n,
      99999999n,
      123456789012345n,
      9876543210987654321n,
    ];

    for (const num of testCases) {
      const encoded = encode(num);
      const decoded = decode(encoded);
      expect(decoded).toBe(num);
    }
  });

  it('should throw an error on invalid characters during decode', () => {
    expect(() => decode('abc@def')).toThrow('Invalid Base62 character');
    expect(() => decode('hello world')).toThrow('Invalid Base62 character');
  });
});

describe('Short Code Generator', () => {
  it('should generate codes of expected length', () => {
    const code6 = generateRandomShortCode(6);
    expect(code6).toHaveLength(6);

    const code7 = generateRandomShortCode(7);
    expect(code7).toHaveLength(7);
  });

  it('should only contain valid Base62 characters', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRandomShortCode(6);
      expect(code).toMatch(/^[0-9A-Za-z]{6}$/);
    }
  });

  it('should generate unique codes (collision test)', () => {
    const set = new Set();
    const count = 1000;
    for (let i = 0; i < count; i++) {
      set.add(generateRandomShortCode(6));
    }
    // High entropy should result in 0 collisions in 1000 random samples
    expect(set.size).toBe(count);
  });
});

describe('Reserved Alias Validation', () => {
  it('should identify all critical system aliases as reserved', () => {
    expect(isReservedAlias('admin')).toBe(true);
    expect(isReservedAlias('ADMIN')).toBe(true); // Case-insensitive
    expect(isReservedAlias('api')).toBe(true);
    expect(isReservedAlias('health')).toBe(true);
    expect(isReservedAlias('metrics')).toBe(true);
    expect(isReservedAlias('login')).toBe(true);
    expect(isReservedAlias('register')).toBe(true);
    expect(isReservedAlias('favicon.ico')).toBe(true);
  });

  it('should allow valid user custom aliases', () => {
    expect(isReservedAlias('my-portfolio')).toBe(false);
    expect(isReservedAlias('github')).toBe(false);
    expect(isReservedAlias('cool_project_2024')).toBe(false);
  });
});
