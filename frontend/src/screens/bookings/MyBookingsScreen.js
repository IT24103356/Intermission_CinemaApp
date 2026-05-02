import React, { useState, useCallback, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';

const formatWhen = (showtime) => {
  if (!showtime?.date) return '';
  const d = new Date(showtime.date);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

export default function MyBookingsScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const tabBarHeight = useBottomTabBarHeight();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user) {
      setBookings([]);
      return;
    }
    try {
      const res = await api.get('/bookings/my');
      setBookings(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn(err.response?.data?.message || err.message);
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleCancel = (item) => {
    if (item.status === 'cancelled') return;
    Alert.alert('Cancel booking', 'Release these seats and cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.put(`/bookings/${item._id}`);
            await load();
            Alert.alert('Done', 'Your booking was cancelled.');
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Could not cancel');
          }
        },
      },
    ]);
  };

  if (loading && bookings.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e50914" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBanner}>
        <View style={styles.bannerHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Movies')}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.bannerTextWrap}>
            <Text style={styles.title}>My bookings</Text>
            <Text style={styles.bannerCaption}>
              Your tickets and showtimes. Open a movie and tap Book now to get seats.
            </Text>
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={styles.browseBtn}
        onPress={() => navigation.navigate('Movies')}
      >
        <Text style={styles.browseBtnText}>Browse movies</Text>
      </TouchableOpacity>

      <FlatList
        data={bookings}
        keyExtractor={item => item._id}
        contentContainerStyle={[styles.list, { paddingBottom: 24 + tabBarHeight }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e50914" />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            You have no bookings yet. Pick a movie, choose a showtime, then select your seats.
          </Text>
        }
        renderItem={({ item }) => {
          const m = item.showtime?.movie;
          const st = item.showtime;
          const isCancelled = item.status === 'cancelled';
          return (
            <View style={[styles.card, isCancelled && styles.cardCanceled]}>
              <Text style={styles.movieName} numberOfLines={1}>
                {m?.title || 'Movie'}
              </Text>
              {st && (
                <Text style={styles.line}>
                  {formatWhen(st)} · {st.time} · Screen {st.screenNumber}
                </Text>
              )}
              <Text style={styles.seats}>
                Seats: {item.seats?.join(', ')} · ${item.totalPrice ?? '—'}
              </Text>
              <Text style={[styles.status, isCancelled && styles.statusOff]}>
                {isCancelled ? 'Cancelled' : 'Confirmed'}
              </Text>
              {!isCancelled && (
                <TouchableOpacity
                  onPress={() => handleCancel(item)}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelText}>Cancel booking</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', paddingTop: 8, paddingHorizontal: 16 },
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f0f' },
  title: { fontSize: 24, fontWeight: '700', color: '#fff' },
  bannerCaption: { color: '#ffd7db', fontSize: 14, marginTop: 6, lineHeight: 20 },
  caption: { color: '#888', fontSize: 14, marginTop: 8, lineHeight: 20, marginBottom: 12 },
  browseBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#1c1c1c',
    borderWidth: 1,
    borderColor: '#e50914',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  browseBtnText: { color: '#e50914', fontWeight: '600' },
  list: { paddingBottom: 8 },
  empty: { color: '#666', fontSize: 14, textAlign: 'center', marginTop: 32, lineHeight: 22, paddingHorizontal: 12 },
  card: {
    backgroundColor: '#1c1c1c',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardCanceled: { opacity: 0.75 },
  movieName: { color: '#fff', fontSize: 18, fontWeight: '600' },
  line: { color: '#999', fontSize: 14, marginTop: 6 },
  seats: { color: '#ccc', fontSize: 14, marginTop: 4 },
  status: { color: '#1D9E75', fontSize: 12, marginTop: 8, fontWeight: '600' },
  statusOff: { color: '#999' },
  cancelBtn: { marginTop: 10, alignSelf: 'flex-start' },
  cancelText: { color: '#c44', fontSize: 14, fontWeight: '600' },
});
