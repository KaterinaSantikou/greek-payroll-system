/**
 * Example test file to demonstrate coverage tracking
 */

describe('Example Test Suite', () => {
  test('should pass basic assertion', () => {
    expect(true).toBe(true);
  });

  test('should handle basic math', () => {
    const add = (a: number, b: number) => a + b;
    expect(add(2, 3)).toBe(5);
  });

  test('should work with strings', () => {
    const greet = (name: string) => `Hello, ${name}!`;
    expect(greet('World')).toBe('Hello, World!');
  });
});

// Example function to test coverage
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return (value / total) * 100;
}

describe('Coverage Example', () => {
  test('should calculate percentage correctly', () => {
    expect(calculatePercentage(50, 100)).toBe(50);
    expect(calculatePercentage(25, 100)).toBe(25);
  });

  test('should handle zero total', () => {
    expect(calculatePercentage(10, 0)).toBe(0);
  });
});