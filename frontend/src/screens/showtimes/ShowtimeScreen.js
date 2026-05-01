import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/axios';

export default function ShowtimeScreen({ route, navigation }) {
  const { showtimeId, movieTitle } = route.params;

  const [showtime, setShowtime] = useState(null);
  const [takenSeats, setTakenSeats] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchShowtime = useCallback(async () => {
    if (!showtimeId) return;
    setLoading(true);
    try {
      const [showRes, takenRes] = await Promise.all([
        api.get(`/showtimes/${showtimeId}`),
        api.get(`/bookings/showtime/${showtimeId}/taken`),
      ]);
      setShowtime(showRes.data);
      setTakenSeats(Array.isArray(takenRes.data?.takenSeats) ? takenRes.data.takenSeats : []);
    } catch (err) {
      Alert.alert('Error', 'Could not load showtime');
    } finally {
      setLoading(false);
    }
  }, [showtimeId]);

  useFocusEffect(
    useCallback(() => {
      fetchShowtime();
    }, [fetchShowtime])
  );

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e50914" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topBanner}>
        <View style={styles.bannerHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.bannerTextWrap}>
            <Text style={styles.movieTitle}>{movieTitle}</Text>
            <Text style={styles.date}>{formatDate(showtime.date)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.header}>
        <View style={styles.metaRow}>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Time</Text>
            <Text style={styles.metaValue}>{showtime.time}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Screen</Text>
            <Text style={styles.metaValue}>{showtime.screenNumber}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Available</Text>
            <Text style={styles.metaValue}>{showtime.availableSeats}</Text>
          </View>
        </View>
      </View>

      {/* Book Now Button */}
      <View style={styles.bookingSection}>
        <TouchableOpacity
          style={[styles.bookButton, showtime.availableSeats === 0 && styles.bookButtonDisabled]}
          disabled={showtime.availableSeats === 0}
          onPress={() => navigation.navigate('SeatBooking', {
            showtimeId: showtime._id,
            movieTitle,
            showtime,
            takenSeats,
          })}
        >
          <Text style={styles.bookButtonText}>
            {showtime.availableSeats === 0 ? 'Sold Out' : 'Select Seats & Book'}
          </Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#0f0f0f' },
  content:             { paddingTop: 8, paddingBottom: 20, paddingHorizontal: 20 },
  centered:            { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f0f' },
  topBanner: {
    backgroundColor: '#e50914',
    borderRadius: 28,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    marginBottom: 14,
    marginHorizontal: -24,
    borderWidth: 1,
    borderColor: '#c80712',
  },
  bannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bannerTextWrap: { flex: 1 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#aa1d27',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  backButtonText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 24 },
  header:              { paddingHorizontal: 20, paddingTop: 0, paddingBottom: 8 },
  movieTitle:          { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 6 },
  date:                { fontSize: 14, color: '#ffd7db', marginBottom: 0 },
  metaRow:             { flexDirection: 'row', gap: 12 },
  metaBox:             { flex: 1, backgroundColor: '#1c1c1c', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a2a' },
  metaLabel:           { fontSize: 11, color: '#666', marginBottom: 4 },
  metaValue:           { fontSize: 16, fontWeight: '600', color: '#fff' },
  bookingSection:      { padding: 20 },
  bookButton:          { backgroundColor: '#e50914', borderRadius: 10, padding: 16, alignItems: 'center' },
  bookButtonDisabled:  { backgroundColor: '#333' },
  bookButtonText:      { color: '#fff', fontSize: 16, fontWeight: '600' },
});