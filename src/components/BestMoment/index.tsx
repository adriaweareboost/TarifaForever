import type { ModelForecast, ForecastHour } from '../../utils/forecastService';

interface BestMomentProps {
  forecasts: ModelForecast[];
  loading: boolean;
}

interface DaySlot {
  dayLabel: string;
  dateLabel: string;
  startHour: string;
  endHour: string;
  avgWind: number;
  avgGust: number;
  direction: string;
  windDegrees: number;
  score: number;
}

/** Levante (E component) vs Poniente (W component) based on wind origin degrees */
function getWindType(degrees: number): string {
  // Normalize to 0-360
  const d = ((degrees % 360) + 360) % 360;
  // East component: roughly 0-180 (N through E to S)
  // West component: roughly 180-360 (S through W to N)
  // More precisely for Tarifa:
  // Levante: 45-170 (NE→E→S)
  // Poniente: 225-350 (SW→W→NW)
  if (d >= 45 && d <= 170) return 'LEVANTE';
  if (d >= 225 && d <= 350) return 'PONIENTE';
  // Transitional
  if (d > 170 && d < 225) return 'PONIENTE';
  return 'LEVANTE';
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Score a single hour for kite suitability (higher = better) */
function scoreHour(speed: number, gust: number): number {
  // Ideal wind: 14-25 kts
  let windScore: number;
  if (speed >= 14 && speed <= 25) {
    windScore = 100;
  } else if (speed >= 12 && speed < 14) {
    windScore = 70;
  } else if (speed > 25 && speed <= 30) {
    windScore = 60;
  } else if (speed >= 8 && speed < 12) {
    windScore = 30;
  } else if (speed > 30 && speed <= 35) {
    windScore = 20;
  } else {
    windScore = 0;
  }

  // Penalize high gust factor
  const gustFactor = speed > 0 ? gust / speed : 2;
  const gustPenalty = gustFactor > 1.6 ? 30 : gustFactor > 1.4 ? 15 : 0;

  // Penalize night hours (no kiting at night, but we filter that separately)
  return Math.max(0, windScore - gustPenalty);
}

/** Find the best 3-hour window in a set of hours */
function findBestWindow(hours: ForecastHour[]): DaySlot | null {
  if (hours.length < 1) return null;

  // Only consider daylight hours (7:00 - 20:00)
  const daylight = hours.filter((h) => {
    const hr = new Date(h.time).getHours();
    return hr >= 7 && hr <= 20;
  });

  if (daylight.length === 0) return null;

  let bestScore = -1;
  let bestStart = 0;
  let bestLen = 1;

  // Sliding window of 2-3 consecutive slots (each slot = 3h, so window = 6-9h)
  // Actually each hour entry is every 3h, so 1 slot = 3h, 2 slots = 6h
  // Let's find best single slot or consecutive pair
  for (let i = 0; i < daylight.length; i++) {
    // Single slot (3h window)
    const s1 = scoreHour(daylight[i].windSpeed, daylight[i].windGust);
    if (s1 > bestScore) {
      bestScore = s1;
      bestStart = i;
      bestLen = 1;
    }

    // Two consecutive slots (6h window) — use average score
    if (i + 1 < daylight.length) {
      const s2 = scoreHour(daylight[i + 1].windSpeed, daylight[i + 1].windGust);
      const avg = (s1 + s2) / 2;
      if (avg > bestScore) {
        bestScore = avg;
        bestStart = i;
        bestLen = 2;
      }
    }
  }

  if (bestScore <= 0) return null;

  const windowHours = daylight.slice(bestStart, bestStart + bestLen);
  const avgWind = Math.round(windowHours.reduce((s, h) => s + h.windSpeed, 0) / windowHours.length);
  const avgGust = Math.round(windowHours.reduce((s, h) => s + h.windGust, 0) / windowHours.length);
  const direction = windowHours[0].windDirectionLabel;
  const windDegrees = windowHours[0].windDirection;

  const startTime = new Date(windowHours[0].time);
  const endTime = new Date(windowHours[windowHours.length - 1].time);
  endTime.setHours(endTime.getHours() + 3); // Add 3h for the last slot's duration

  const date = new Date(windowHours[0].time);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  return {
    dayLabel: isToday ? 'Today' : isTomorrow ? 'Tomorrow' : DAY_NAMES[date.getDay()],
    dateLabel: windowHours[0].dateLabel,
    startHour: `${String(startTime.getHours()).padStart(2, '0')}:00`,
    endHour: `${String(endTime.getHours()).padStart(2, '0')}:00`,
    avgWind,
    avgGust,
    direction,
    windDegrees,
    score: bestScore,
  };
}

/** Compute best moments from averaged model data, grouped by day */
function computeBestMoments(forecasts: ModelForecast[]): DaySlot[] {
  if (forecasts.length === 0) return [];

  // Average wind across models per time slot
  const ref = forecasts[0].hours;
  const averaged: ForecastHour[] = ref.map((h, i) => {
    const speeds = forecasts.map((f) => f.hours[i]?.windSpeed ?? 0);
    const gusts = forecasts.map((f) => f.hours[i]?.windGust ?? 0);
    return {
      ...h,
      windSpeed: Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length),
      windGust: Math.round(gusts.reduce((a, b) => a + b, 0) / gusts.length),
    };
  });

  // Group by calendar day
  const byDay = new Map<string, ForecastHour[]>();
  for (const h of averaged) {
    const dayKey = new Date(h.time).toDateString();
    if (!byDay.has(dayKey)) byDay.set(dayKey, []);
    byDay.get(dayKey)!.push(h);
  }

  // Find best window per day (max 3 days)
  const slots: DaySlot[] = [];
  for (const hours of byDay.values()) {
    const slot = findBestWindow(hours);
    if (slot) slots.push(slot);
    if (slots.length >= 3) break;
  }

  return slots;
}

function qualityLabel(score: number): { text: string; color: string; bg: string } {
  if (score >= 80) return { text: 'Excellent', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
  if (score >= 50) return { text: 'Good', color: 'text-emerald-600', bg: 'bg-emerald-50/50 border-emerald-100' };
  if (score >= 25) return { text: 'Marginal', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' };
  return { text: 'Poor', color: 'text-red-600', bg: 'bg-red-50 border-red-200' };
}

export function BestMoment({ forecasts, loading }: BestMomentProps) {
  if (loading) {
    return (
      <div className="metric-card animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-40 mb-3" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const slots = computeBestMoments(forecasts);

  if (slots.length === 0) {
    return (
      <div className="metric-card">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Best Moment to Kite <span className="font-normal normal-case text-gray-300">in the next 72h</span></p>
        <p className="text-sm text-gray-400">No suitable kite windows in the next 72h</p>
      </div>
    );
  }

  return (
    <div className="metric-card">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Best Moment to Kite <span className="font-normal normal-case text-gray-300">in the next 72h</span></p>
      <div className="grid grid-cols-3 gap-3">
        {slots.map((slot) => {
          const q = qualityLabel(slot.score);
          return (
            <div key={slot.dateLabel + slot.startHour} className={`rounded-xl border p-3 ${q.bg}`}>
              <p className="text-xs font-bold text-gray-900">{slot.dayLabel}</p>
              <p className="text-[10px] text-gray-400">{slot.dateLabel}</p>
              <p className="text-xs font-bold text-gray-900 mt-2 whitespace-nowrap">
                {slot.startHour}<span className="text-gray-400 font-medium"> – </span>{slot.endHour}
              </p>
              <p className="text-base font-extrabold text-gray-900 mt-1">
                {slot.avgWind}<span className="text-gray-400 font-medium text-sm">/{slot.avgGust}</span> <span className="text-sm font-semibold text-gray-500">kts</span>
              </p>
              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-gray-500">{slot.direction}</span>
                <span className="text-[10px] font-extrabold tracking-wide text-gray-700">{getWindType(slot.windDegrees)}</span>
              </div>
              <p className={`text-[10px] font-semibold mt-1 ${q.color}`}>{q.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
