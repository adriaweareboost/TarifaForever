import { describe, it, expect } from 'vitest';
import { generateTideData } from '../tides';

describe('generateTideData', () => {
  it('generates the requested number of days', () => {
    const result = generateTideData(3);
    expect(result).toHaveLength(3);
  });

  it('generates default 3 days when no argument', () => {
    const result = generateTideData();
    expect(result).toHaveLength(3);
  });

  it('each day has a valid ISO date string', () => {
    const result = generateTideData(2);
    for (const day of result) {
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('each day has tide points with high and low types', () => {
    const result = generateTideData(1);
    const types = result[0].points.map(p => p.type);
    expect(types).toContain('high');
    expect(types).toContain('low');
  });

  it('tide heights are positive numbers', () => {
    const result = generateTideData(1);
    for (const point of result[0].points) {
      expect(point.height).toBeGreaterThan(0);
    }
  });

  it('semidiurnal pattern produces ~4 tide events per day', () => {
    const result = generateTideData(1);
    const count = result[0].points.length;
    expect(count).toBeGreaterThanOrEqual(3);
    expect(count).toBeLessThanOrEqual(5);
  });

  it('tide points have valid Date objects', () => {
    const result = generateTideData(1);
    for (const point of result[0].points) {
      expect(point.time).toBeInstanceOf(Date);
      expect(point.time.getTime()).not.toBeNaN();
    }
  });
});
