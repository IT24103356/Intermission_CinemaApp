import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Image, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/axios';

export default function MovieDetailScreen({ route, navigation }) {
  const { movieId } = route.params;

  const [movie,         setMovie]         = useState(null);
  const [showtimes,     setShowtimes]     = useState([]);
  const [averageRating, setAverageRating] = useState(null);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    fetchAll();
  }, [movieId]);

  const refetchShowtimesAndRating = useCallback(async () => {
    if (!movieId) return;
    const [showResult, ratingResult] = await Promise.allSettled([
      api.get(`/showtimes/movie/${movieId}`),
      api.get(`/feedback/movie/${movieId}/average`),
    ]);
    if (showResult.status === 'fulfilled') {
      setShowtimes(Array.isArray(showResult.value.data) ? showResult.value.data : []);
    } else {
      setShowtimes([]);
    }
    if (ratingResult.status === 'fulfilled') {
      setAverageRating(ratingResult.value.data);
    } else {
      setAverageRating({ averageRating: 0, totalReviews: 0 });
    }
  }, [movieId]);

  useFocusEffect(
    useCallback(() => {
      if (!movieId) return;
      refetchShowtimesAndRating();
    }, [movieId, refetchShowtimesAndRating])
  );

  const fetchAll = async () => {
    if (!movieId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const movieRes = await api.get(`/movies/${movieId}`);
      setMovie(movieRes.data);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Could not load movie. Check that the server is running and the API address in axios is correct.';
      Alert.alert('Error', msg);
      setMovie(null);
      setLoading(false);
      return;
    }

    await refetchShowtimesAndRating();
    setLoading(false);
  };

  const renderStars = (rating) => {
    const stars = Math.round(rating);
    return '★'.repeat(stars) + '☆'.repeat(5 - stars);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e50914" />
      </View>
    );
  }

  if (!movie) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Movie not found</Text>
      </View>
    );
  }

  const canBook =
    showtimes.length > 0 && showtimes.some(s => s.availableSeats > 0);

  const handleBookNow = () => {
    if (showtimes.length === 0) {
      Alert.alert('No showtimes', 'There are no showtimes for this movie yet.');
      return;
    }
    const next = showtimes.find(s => s.availableSeats > 0);
    if (!next) {
      Alert.alert('Sold out', 'All showtimes are currently sold out.');
      return;
    }
    navigation.navigate('Showtimes', {
      showtimeId: next._id,
      movieTitle: movie.title,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.heroRow}>
        {movie.posterUrl ? (
          <Image source={{ uri: movie.posterUrl }} style={styles.posterThumb} />
        ) : (
          <View style={styles.posterThumbPlaceholder}>
            <Text style={styles.posterEmoji}>🎬</Text>
          </View>
        )}

        <View style={styles.heroDetails}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={3}>{movie.title}</Text>
            {movie.isTrending && <Text style={styles.trending}>🔥</Text>}
          </View>

          <View style={styles.badgeRow}>
            <View style={[styles.badge, movie.status === 'Now Showing' ? styles.badgeGreen : styles.badgeGray]}>
              <Text style={styles.badgeText}>{movie.status}</Text>
            </View>
          </View>

          <Text style={styles.metaLine}>{movie.genre}</Text>
          <Text style={styles.metaLine}>{movie.duration} min</Text>
          {movie.releaseDate && (
            <Text style={styles.metaLine}>
              Released {new Date(movie.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          )}

          {averageRating && averageRating.totalReviews > 0 && (
            <View style={styles.ratingBlock}>
              <Text style={styles.stars}>{renderStars(averageRating.averageRating)}</Text>
              <Text style={styles.ratingText}>
                {averageRating.averageRating} / 5 · {averageRating.totalReviews} reviews
              </Text>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.bookNowButton, !canBook && styles.bookNowButtonDisabled]}
        onPress={handleBookNow}
        disabled={!canBook}
      >
        <Text style={[styles.bookNowText, !canBook && styles.bookNowTextDisabled]}>
          {!canBook && showtimes.length > 0
            ? 'Sold out'
            : !canBook
              ? 'No showtimes'
              : 'Book now'}
        </Text>
      </TouchableOpacity>

      <View style={styles.info}>

        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.description}>{movie.description || 'No description available.'}</Text>

        {/* Showtimes */}
        <Text style={styles.sectionTitle}>Showtimes</Text>
        {showtimes.length === 0 ? (
          <Text style={styles.noShowtimes}>No showtimes available</Text>
        ) : (
          showtimes.map(show => (
            <TouchableOpacity
              key={show._id}
              style={styles.showtimeCard}
              onPress={() => navigation.navigate('Showtimes', { showtimeId: show._id, movieTitle: movie.title })}
            >
              <View>
                <Text style={styles.showtimeDate}>{formatDate(show.date)}</Text>
                <Text style={styles.showtimeScreen}>Screen {show.screenNumber}</Text>
              </View>
              <View style={styles.showtimeRight}>
                <Text style={styles.showtimeTime}>{show.time}</Text>
                <Text style={styles.showtimeSeats}>{show.availableSeats} seats left</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.feedbackButton}
            onPress={() => navigation.navigate('Feedback', { movieId: movie._id, movieTitle: movie.title })}
          >
            <Text style={styles.feedbackButtonText}>⭐ Leave a Review</Text>
          </TouchableOpacity>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#0f0f0f' },
  scrollContent:      { paddingBottom: 32 },
  centered:           { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f0f' },
  errorText:          { color: '#999', fontSize: 16 },
  backButton:         { position: 'absolute', top: 52, left: 16, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  backText:           { color: '#fff', fontSize: 14 },
  heroRow:            { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 100, paddingBottom: 4, gap: 16, alignItems: 'flex-start' },
  posterThumb:        { width: 140, height: 210, borderRadius: 12, backgroundColor: '#1c1c1c' },
  posterThumbPlaceholder: {
    width: 140, height: 210, borderRadius: 12, backgroundColor: '#1c1c1c', justifyContent: 'center', alignItems: 'center',
  },
  posterEmoji:        { fontSize: 48 },
  heroDetails:        { flex: 1, minWidth: 0 },
  titleRow:           { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 8 },
  title:              { fontSize: 20, fontWeight: 'bold', color: '#fff', flex: 1 },
  trending:           { fontSize: 20 },
  badgeRow:           { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  badge:              { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 },
  badgeGreen:         { backgroundColor: '#0f3d2e' },
  badgeGray:          { backgroundColor: '#2a2a2a' },
  badgeText:          { fontSize: 12, color: '#1D9E75', fontWeight: '500' },
  metaLine:           { fontSize: 13, color: '#999', marginBottom: 4 },
  ratingBlock:        { marginTop: 8 },
  stars:              { fontSize: 16, color: '#EF9F27', letterSpacing: 2 },
  ratingText:         { color: '#999', fontSize: 12, marginTop: 4, flexWrap: 'wrap' },
  bookNowButton:      { marginHorizontal: 20, marginTop: 16, backgroundColor: '#e50914', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  bookNowButtonDisabled: { backgroundColor: '#333' },
  bookNowText:        { color: '#fff', fontSize: 17, fontWeight: '700' },
  bookNowTextDisabled: { color: '#888' },
  info:               { padding: 20, paddingTop: 8 },
  sectionTitle:       { fontSize: 17, fontWeight: '600', color: '#fff', marginBottom: 10, marginTop: 6 },
  description:        { color: '#aaa', fontSize: 14, lineHeight: 22, marginBottom: 20 },
  noShowtimes:        { color: '#666', fontSize: 14, marginBottom: 20 },
  showtimeCard:       { backgroundColor: '#1c1c1c', borderRadius: 10, padding: 14, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#2a2a2a' },
  showtimeDate:       { color: '#fff', fontSize: 14, fontWeight: '500' },
  showtimeScreen:     { color: '#666', fontSize: 12, marginTop: 2 },
  showtimeRight:      { alignItems: 'flex-end' },
  showtimeTime:       { color: '#e50914', fontSize: 16, fontWeight: '600' },
  showtimeSeats:      { color: '#666', fontSize: 12, marginTop: 2 },
  actions:            { marginTop: 10, marginBottom: 40 },
  feedbackButton:     { backgroundColor: '#1c1c1c', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a2a' },
  feedbackButtonText: { color: '#EF9F27', fontSize: 15, fontWeight: '500' },
});