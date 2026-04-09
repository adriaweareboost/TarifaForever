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
  describe('75-90 kg', () => {
    it('recommends 8m² for strong wind (28+ knots)', () => {
      expect(recommendKiteSize(30, '75-90')).toBe('8');
    });

    it('recommends 11m² for moderate wind (18-22 knots)', () => {
      expect(recommendKiteSize(20, '75-90')).toBe('11');
    });

    it('recommends 16m² for light wind (12-15 knots)', () => {
      expect(recommendKiteSize(13, '75-90')).toBe('16');
    });

    it('returns not enough wind for <12 knots', () => {
      expect(recommendKiteSize(8, '75-90')).toBe('Not enough wind');
    });

    it('defaults to 75-90 profile when no weight given', () => {
      expect(recommendKiteSize(20)).toBe('11');
    });
  });

  describe('45-60 kg', () => {
    it('recommends 5m² for strong wind (28+ knots)', () => {
      expect(recommendKiteSize(30, '45-60')).toBe('5');
    });

    it('recommends 8m² for moderate wind (18-22 knots)', () => {
      expect(recommendKiteSize(20, '45-60')).toBe('8');
    });

    it('recommends 13m² for light wind (10-12 knots)', () => {
      expect(recommendKiteSize(11, '45-60')).toBe('13');
    });
  });
});
