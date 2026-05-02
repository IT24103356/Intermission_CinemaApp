/**
 * If populate lost `showtime.movie` (e.g. hard-deleted movie), rebuild it from fields stored on the booking.
 */
function mergeMovieSnapshotIntoBookingPlain(o) {
  if (!o?.showtime) return o;
  const st = o.showtime;
  const m = st.movie;
  const hasTitle = m && typeof m.title === 'string' && m.title.trim().length > 0;
  if (hasTitle) return o;
  const snap = o.movieTitle && String(o.movieTitle).trim();
  if (snap) {
    const mid = o.movieRef || st.movie;
    st.movie = {
      _id: mid,
      title: o.movieTitle,
      posterUrl: o.moviePosterUrl || undefined,
      duration:
        typeof o.movieDuration === 'number' && o.movieDuration > 0 ? o.movieDuration : undefined,
    };
  }
  return o;
}

module.exports = { mergeMovieSnapshotIntoBookingPlain };
