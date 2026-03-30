import { describe, it, expect } from 'vitest';
import { calcQuality, recommendKiteSize } from '../quality';

describe('calcQuality', () => {
  it('returns good for ideal kitesurf conditions', () => {
    expect(calcQuality(18, 22, 1.0)).toBe('good');
  });

  it('returns good at lower good-wind boundary', () => {
    expect(calcQuality(12, 15, 0.5)).toBe('good');
  });

  it('returns moderate for borderline wind', () => {
    expect(calcQuality(10, 12, 1.0)).toBe('moderate');
  });

  it('returns poor for very low wind', () => {
    expect(calcQuality(5, 6, 0.5)).toBe('poor');
  });

  it('returns poor for excessive waves', () => {
    expect(calcQuality(18, 22, 3.0)).toBe('poor');
  });

  it('returns moderate when gusts are too high but wind is acceptable', () => {
    expect(calcQuality(15, 30, 1.0)).toBe('moderate');
  });
});

describe('recommendKiteSize', () => {
  it('recommends 7-9m² for strong wind (25+ knots)', () => {
    expect(recommendKiteSize(28)).toBe('7-9');
  });

  it('recommends 9-11m² for moderate-strong wind (18-24 knots)', () => {
    expect(recommendKiteSize(20)).toBe('9-11');
  });

  it('recommends 11-13m² for moderate wind (12-17 knots)', () => {
    expect(recommendKiteSize(14)).toBe('11-13');
  });

  it('recommends 13+m² for light wind (<12 knots)', () => {
    expect(recommendKiteSize(8)).toBe('13+');
  });

  it('handles boundary at 25 knots', () => {
    expect(recommendKiteSize(25)).toBe('7-9');
  });

  it('handles boundary at 18 knots', () => {
    expect(recommendKiteSize(18)).toBe('9-11');
  });

  it('handles boundary at 12 knots', () => {
    expect(recommendKiteSize(12)).toBe('11-13');
  });
});
