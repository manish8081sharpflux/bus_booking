const validation = require('../validation');

describe('shared validation', () => {
  test('normalizes Indian mobile numbers', () => {
    expect(validation.indianMobile('+91 98765 43210')).toBe('9876543210');
  });

  test('rejects invalid mobile numbers', () => {
    expect(() => validation.indianMobile('12345')).toThrow();
  });

  test('normalizes emails', () => {
    expect(validation.email(' Test@Example.COM ')).toBe('test@example.com');
  });

  test('rejects malformed UUIDs', () => {
    expect(() => validation.uuid('abc', 'Trip ID')).toThrow();
  });
});
