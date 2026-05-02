import React, { useCallback, useContext, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';

const BG = '#0f0f0f';
const CARD = '#1c1c1c';
const BORDER = '#2a2a2a';
const ACCENT = '#e50914';
const MUTED = '#999';

function statusStyle(st) {
  if (st === 'approved') return { bg: 'rgba(46,160,67,0.2)', color: '#3fb950' };
  if (st === 'rejected') return { bg: 'rgba(196,68,68,0.2)', color: '#c44' };
  return { bg: 'rgba(255,200,0,0.12)', color: '#d4a017' };
}

export default function AdminSuggestionsScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const tabBarHeight = useBottomTabBarHeight();

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  const loadSuggestions = useCallback(async () => {
    if (user?.role !== 'admin') {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/suggestions/admin/all');
      setSuggestions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setSuggestions([]);
      Alert.alert('Error', err.response?.data?.message || 'Could not load suggestions');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadSuggestions();
    }, [loadSuggestions])
  );

  const setStatus = async (id, status) => {
    try {
      setSavingId(id);
      await api.put(`/suggestions/${id}/status`, { status });
      await loadSuggestions();
    } catch (err) {
      Alert.alert('Update failed', err.response?.data?.message || 'Could not update status');
    } finally {
      setSavingId(null);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <View style={[styles.centered, { paddingBottom: tabBarHeight + 16 }]}>
        <Text style={styles.title}>Admin Suggestions</Text>
        <Text style={styles.muted}>Only admins can access this screen.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.centered, { paddingBottom: tabBarHeight + 16 }]}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={suggestions}
        keyExtractor={item => item._id}
        contentContainerStyle={{ padding: 16, paddingBottom: tabBarHeight + 24 }}
        ListHeaderComponent={
          <View style={styles.topBanner}>
            <View style={styles.bannerHeader}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Movies')}>
                <Text style={styles.backButtonText}>←</Text>
              </TouchableOpacity>
              <View style={styles.bannerTextWrap}>
                <Text style={styles.title}>Suggestion Review</Text>
                <Text style={styles.bannerCaption}>Review movie requests and track vote counts.</Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={<Text style={styles.muted}>No suggestions available.</Text>}
        renderItem={({ item }) => {
          const st = statusStyle(item.status);
          const busy = savingId === item._id;
          return (
            <View style={styles.card}>
              <View style={styles.head}>
                <Text style={styles.movieTitle}>{item.movieTitle}</Text>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.color }]}>
                    {item.status || 'pending'}
                  </Text>
                </View>
              </View>

              <Text style={styles.meta}>By {item.user?.name || 'User'} ({item.user?.email || 'no email'})</Text>
              {!!item.description && <Text style={styles.description}>{item.description}</Text>}
              <Text style={styles.votes}>{item.votes ?? 0} votes</Text>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn, busy && styles.disabled]}
                  disabled={busy}
                  onPress={() => setStatus(item._id, 'approved')}
                >
                  <Text style={styles.actionBtnText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn, busy && styles.disabled]}
                  disabled={busy}
                  onPress={() => setStatus(item._id, 'rejected')}
                >
                  <Text style={styles.actionBtnText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.pendingBtn, busy && styles.disabled]}
                  disabled={busy}
                  onPress={() => setStatus(item._id, 'pending')}
                >
                  <Text style={styles.actionBtnText}>Pending</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
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
  title: { color: '#fff', fontSize: 24, fontWeight: '700' },
  bannerCaption: { color: '#ffd7db', fontSize: 14, marginTop: 6 },
  muted: { color: MUTED, fontSize: 14, marginTop: 6 },
  card: {
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 12,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  movieTitle: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '600' },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  meta: { color: MUTED, fontSize: 13, marginTop: 6, marginBottom: 6 },
  description: { color: '#ddd', fontSize: 14, lineHeight: 20, marginBottom: 10 },
  votes: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  approveBtn: { backgroundColor: '#177f3f' },
  rejectBtn: { backgroundColor: '#8a1f1f' },
  pendingBtn: { backgroundColor: '#6b5a13' },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
