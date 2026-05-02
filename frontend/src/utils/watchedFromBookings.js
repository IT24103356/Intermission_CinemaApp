import { isShowEnded, showEndMsUtc } from './showtimeTiming';

/**
 * Unique movies from confirmed bookings whose screening has ended (newest end first).
 * @param {Array} bookings – populated `showtime.movie` like `/bookings/my`
 * @returns {{ movie: object, lastEndedAt: number }[]}
 */
export function buildWatchedMovieRowsFromBookings(bookings) {
  if (!Array.isArray(bookings)) return [];
  const best = new Map();
  for (const b of bookings) {
    if (b.status !== 'confirmed') continue;
    const st = b.showtime;
    const m = st?.movie;
    if (!st || !m) continue;
    if (!isShowEnded(st, m.duration)) continue;
    const id = String(m._id);
    const endMs = showEndMsUtc(st, m.duration);
    const prev = best.get(id);
    if (!prev || endMs > prev.endMs) {
      best.set(id, { movie: m, endMs });
    }
  }
  return Array.from(best.values())
    .sort((a, b) => b.endMs - a.endMs)
    .map(({ movie, endMs }) => ({
      movie,
      lastEndedAt: endMs,
      lastEndedLabel: new Date(endMs).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    }));
}
