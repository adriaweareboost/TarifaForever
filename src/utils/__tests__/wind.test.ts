import { describe, it, expect } from 'vitest';
import { degreesToCompass, circularMeanDegrees, round1 } from '../wind';

describe('degreesToCompass', () => {
  it('converts 0° to N', () => {
    expect(degreesToCompass(0)).toBe('N');
  });

  it('converts 90° to E', () => {
    expect(degreesToCompass(90)).toBe('E');
  });

  it('converts 180° to S', () => {
    expect(degreesToCompass(180)).toBe('S');
  });

  it('converts 270° to W', () => {
    expect(degreesToCompass(270)).toBe('W');
  });

  it('converts 45° to NE', () => {
    expect(degreesToCompass(45)).toBe('NE');
  });

  it('converts 225° to SW', () => {
    expect(degreesToCompass(225)).toBe('SW');
  });

  it('handles 360° as N', () => {
    expect(degreesToCompass(360)).toBe('N');
  });

  it('handles negative degrees', () => {
    expect(degreesToCompass(-90)).toBe('W');
  });

  it('handles degrees > 360', () => {
    expect(degreesToCompass(450)).toBe('E');
  });
});

describe('circularMeanDegrees', () => {
  it('returns 0 for empty array', () => {
    expect(circularMeanDegrees([])).toBe(0);
  });

  it('returns the same value for a single angle', () => {
    const result = circularMeanDegrees([90]);
    expect(Math.round(result)).toBe(90);
  });

  it('computes mean of two opposite-ish angles near north', () => {
    const result = circularMeanDegrees([350, 10]);
    expect(Math.round(result)).toBe(0);
  });

  it('computes mean of identical angles', () => {
    const result = circularMeanDegrees([180, 180, 180]);
    expect(Math.round(result)).toBe(180);
  });
});

describe('round1', () => {
  it('rounds to one decimal', () => {
    expect(round1(3.456)).toBe(3.5);
  });

  it('handles integers', () => {
    expect(round1(5)).toBe(5);
  });

  it('handles negative numbers', () => {
    expect(round1(-2.34)).toBe(-2.3);
  });
});
