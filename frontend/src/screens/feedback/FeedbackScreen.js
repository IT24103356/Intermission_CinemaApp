import React, { useState, useCallback, useContext, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';
import { buildWatchedMovieRowsFromBookings } from '../../utils/watchedFromBookings';

const BG = '#0f0f0f';
const CARD = '#1c1c1c';
const BORDER = '#2a2a2a';
const ACCENT = '#e50914';
const MUTED = '#888';

function Stars({ value, onChange, size = 32 }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map(n => (
        <TouchableOpacity
          key={n}
          onPress={() => onChange(n)}
          hitSlop={8}
          accessibilityLabel={`${n} stars`}
        >
          <Text style={{ fontSize: size, color: n <= value ? '#ffd60a' : '#444' }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ratingLabel(n) {
  const map = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Great', 5: 'Excellent' };
  return map[n] || '';
}

function StarDisplay({ value, size = 20 }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map(n => (
        <Text key={n} style={{ fontSize: size, color: n <= value ? '#ffd60a' : '#444' }}>★</Text>
      ))}
    </View>
  );
}

export default function FeedbackScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const tabBarHeight = useBottomTabBarHeight();

  const [myBookings, setMyBookings] = useState([]);
  const [myFeedback, setMyFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [movieModal, setMovieModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [editRating, setEditRating] = useState(3);
  const [editComment, setEditComment] = useState('');
  const [reviewFilterMovieId, setReviewFilterMovieId] = useState('all');

  const [pickMovie, setPickMovie] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const reviewFilterOptions = useMemo(() => {
    const map = new Map();
    myFeedback.forEach(f => {
      const id = String(f.movie?._id || f.movie || '');
      const title = f.movie?.title || 'Movie';
      if (id && !map.has(id)) {
        map.set(id, { id, title });
      }
    });
    return [{ id: 'all', title: 'All movies' }, ...Array.from(map.values())];
  }, [myFeedback]);

  const filteredMyFeedback = useMemo(() => {
    if (reviewFilterMovieId === 'all') return myFeedback;
    return myFeedback.filter(
      f => String(f.movie?._id || f.movie || '') === reviewFilterMovieId
    );
  }, [myFeedback, reviewFilterMovieId]);

  const watchedRows = useMemo(
    () => buildWatchedMovieRowsFromBookings(myBookings),
    [myBookings]
  );

  const watchedMovies = useMemo(
    () => watchedRows.map((r) => r.movie).filter(Boolean),
    [watchedRows]
  );

  const toRate = useMemo(() => {
    const reviewed = new Set(myFeedback.map((f) => String(f.movie?._id || f.movie || '')));
    return watchedMovies.filter((m) => !reviewed.has(String(m._id)));
  }, [watchedMovies, myFeedback]);

  const load = useCallback(async () => {
    try {
      const [bRes, fRes] = await Promise.allSettled([
        user ? api.get('/bookings/my') : Promise.resolve({ data: [] }),
        user ? api.get('/feedback/my') : Promise.resolve({ data: [] }),
      ]);
      if (bRes.status === 'fulfilled' && Array.isArray(bRes.value.data)) {
        setMyBookings(bRes.value.data);
      } else {
        setMyBookings([]);
      }
      if (fRes.status === 'fulfilled' && Array.isArray(fRes.value.data)) {
        setMyFeedback(fRes.value.data);
      } else {
        setMyFeedback([]);
      }
    } catch {
      setMyBookings([]);
      setMyFeedback([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      load();
    }, [user, load])
  );

  const openEdit = item => {
    setEditId(item._id);
    setEditRating(item.rating || 3);
    setEditComment(item.comment || '');
    setEditModal(true);
  };

  const saveEdit = async () => {
    if (!editId) return;
    if (editRating < 1 || editRating > 5) {
      Alert.alert('Rating', 'Pick a star rating 1–5');
      return;
    }
    try {
      setSaving(true);
      await api.put(`/feedback/${editId}`, {
        rating: editRating,
        comment: editComment.trim() || undefined,
      });
      setEditModal(false);
      setEditId(null);
      await load();
      Alert.alert('Updated', 'Your review was updated.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not update');
    } finally {
      setSaving(false);
    }
  };

  const removeFeedback = id => {
    Alert.alert('Remove review', 'Delete this review?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/feedback/${id}`);
            await load();
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Delete failed');
          }
        },
      },
    ]);
  };

  const submit = async () => {
    if (!user) {
      Alert.alert('Sign in', 'Log in to post feedback.');
      return;
    }
    if (!pickMovie) {
      Alert.alert('Movie', 'Choose a movie to review.');
      return;
    }
    if (rating < 1 || rating > 5) {
      Alert.alert('Rating', 'Tap a star rating from 1 to 5.');
      return;
    }
    try {
      setSaving(true);
      await api.post('/feedback', {
        movieId: pickMovie._id,
        rating,
        comment: comment.trim() || undefined,
      });
      setPickMovie(null);
      setRating(0);
      setComment('');
      await load();
      Alert.alert('Thanks', 'Your review was posted.');
    } catch (err) {
      Alert.alert('Could not post', err.response?.data?.message || 'Try again');
    } finally {
      setSaving(false);
    }
  };

  const padBottom = tabBarHeight + 16;
  const padTop = 8;

  if (!user) {
    return (
      <View style={[styles.emptyRoot, { paddingTop: padTop, paddingBottom: padBottom }]}>
        <View style={styles.topBanner}>
          <View style={styles.bannerHeader}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Movies')}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <View style={styles.bannerTextWrap}>
              <Text style={styles.h1}>Feedback</Text>
              <Text style={styles.bannerCaption}>Log in to rate movies you have watched (after a screening ends).</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingTop: padTop, paddingBottom: padBottom, paddingHorizontal: 20 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topBanner}>
        <View style={styles.bannerHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Movies')}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.bannerTextWrap}>
            <Text style={styles.h1}>Feedback</Text>
            <Text style={styles.bannerCaption}>
              You can only review movies from confirmed bookings after the screening has ended.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Movie</Text>
        <TouchableOpacity
          style={styles.select}
          onPress={() => setMovieModal(true)}
          activeOpacity={0.85}
        >
          <Text style={pickMovie ? styles.selectValue : styles.selectPh}>
            {pickMovie ? pickMovie.title : 'Select a movie…'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>Your rating</Text>
        <Stars value={rating} onChange={setRating} />
        {rating > 0 && <Text style={styles.ratingHint}>{rating} — {ratingLabel(rating)}</Text>}

        <Text style={styles.label}>Comment (optional)</Text>
        <TextInput
          style={styles.textArea}
          placeholder="What did you think?"
          placeholderTextColor="#666"
          value={comment}
          onChangeText={setComment}
          multiline
        />

        <TouchableOpacity
          style={[styles.primaryBtn, saving && styles.btnDisabled]}
          onPress={submit}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnT}>Post review</Text>}
        </TouchableOpacity>

        {toRate.length === 0 && watchedMovies.length > 0 && (
          <Text style={styles.hint}>You have rated every movie you have watched. Thanks!</Text>
        )}
        {watchedMovies.length === 0 && (
          <Text style={styles.hint}>
            No eligible movies yet. Book a ticket, attend the show, then post feedback here or from Bookings → Watched.
          </Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>Your reviews</Text>
      {myFeedback.length === 0 ? (
        <Text style={styles.mutedP}>You haven’t posted a review yet.</Text>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {reviewFilterOptions.map(opt => {
              const active = reviewFilterMovieId === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setReviewFilterMovieId(opt.id)}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {opt.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {filteredMyFeedback.length === 0 ? (
            <Text style={styles.mutedP}>No reviews for the selected movie.</Text>
          ) : (
            filteredMyFeedback.map(f => {
          const title = f.movie?.title || 'Movie';
          return (
            <View key={f._id} style={styles.reviewCard}>
              <View style={styles.reviewTop}>
                {f.movie?.posterUrl ? (
                  <Image source={{ uri: f.movie.posterUrl }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbPh]}>
                    <Text style={styles.thumbEm}>🎬</Text>
                  </View>
                )}
                <View style={styles.reviewBody}>
                  <Text style={styles.reviewTitle} numberOfLines={2}>
                    {title}
                  </Text>
                  <StarDisplay value={f.rating} size={20} />
                  {f.comment ? <Text style={styles.reviewComment}>{f.comment}</Text> : null}
                </View>
              </View>
              <View style={styles.reviewActions}>
                <TouchableOpacity onPress={() => openEdit(f)}>
                  <Text style={styles.link}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeFeedback(f._id)}>
                  <Text style={styles.dangerLink}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
            })
          )}
        </>
      )}

      <Modal visible={movieModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalH}>Choose a movie</Text>
            {toRate.length === 0 ? (
              <Text style={styles.mutedP}>
                {watchedMovies.length
                  ? 'You have already reviewed every movie you have watched.'
                  : 'Attend a screening first; only watched movies can be reviewed.'}
              </Text>
            ) : (
              <FlatList
                data={toRate}
                keyExtractor={(m, i) => String(m?._id ?? `movie-${i}`)}
                style={styles.modalList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalRow}
                    onPress={() => {
                      setPickMovie(item);
                      setMovieModal(false);
                    }}
                  >
                    <Text style={styles.modalRowT}>{item.title}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity onPress={() => setMovieModal(false)} style={styles.modalClose}>
              <Text style={styles.link}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={editModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.editBox}>
            <Text style={styles.modalH}>Edit review</Text>
            <Stars value={editRating} onChange={setEditRating} />
            <TextInput
              style={[styles.textArea, { marginTop: 12 }]}
              placeholder="Comment"
              placeholderTextColor="#666"
              value={editComment}
              onChangeText={setEditComment}
              multiline
            />
            <View style={styles.editRow}>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Text style={styles.mutedP}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveEdit} disabled={saving} style={styles.saveMini}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveMiniT}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  emptyRoot: { flex: 1, backgroundColor: BG, paddingHorizontal: 20, justifyContent: 'center' },
  centered: { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
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
  h1: { color: '#fff', fontSize: 24, fontWeight: '700' },
  bannerCaption: { color: '#ffd7db', fontSize: 14, marginTop: 6, lineHeight: 20 },
  caption: { color: MUTED, fontSize: 14, marginTop: 8, marginBottom: 20, lineHeight: 20 },
  card: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 24,
  },
  label: { color: MUTED, fontSize: 12, marginBottom: 8, fontWeight: '600' },
  select: {
    backgroundColor: BG,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  selectValue: { color: '#fff', fontSize: 16 },
  selectPh: { color: '#666', fontSize: 16 },
  starsRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  ratingHint: { color: MUTED, fontSize: 13, marginBottom: 16 },
  textArea: {
    minHeight: 100,
    backgroundColor: BG,
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
    textAlignVertical: 'top',
    marginBottom: 16,
    fontSize: 15,
  },
  primaryBtn: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnT: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.7 },
  hint: { color: MUTED, fontSize: 13, marginTop: 12, textAlign: 'center' },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 12 },
  filterRow: { paddingBottom: 10, gap: 8 },
  filterChip: {
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  filterChipActive: { borderColor: ACCENT, backgroundColor: 'rgba(229,9,20,0.12)' },
  filterChipText: { color: MUTED, fontSize: 13, fontWeight: '600' },
  filterChipTextActive: { color: ACCENT },
  mutedP: { color: MUTED, fontSize: 15, lineHeight: 22 },
  reviewCard: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
  },
  reviewTop: { flexDirection: 'row', gap: 12 },
  thumb: { width: 56, height: 84, borderRadius: 8, backgroundColor: '#333' },
  thumbPh: { alignItems: 'center', justifyContent: 'center' },
  thumbEm: { fontSize: 24 },
  reviewBody: { flex: 1, minWidth: 0 },
  reviewTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  reviewComment: { color: MUTED, fontSize: 14, marginTop: 6 },
  reviewActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 12 },
  link: { color: ACCENT, fontSize: 15, fontWeight: '600' },
  dangerLink: { color: '#c44', fontSize: 15, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 12, maxHeight: '70%' },
  modalH: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8, paddingHorizontal: 4 },
  modalList: { maxHeight: 360 },
  modalRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 8 },
  modalRowT: { color: '#fff', fontSize: 16 },
  modalClose: { padding: 16, alignItems: 'center' },
  editBox: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: BORDER },
  editRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  saveMini: { backgroundColor: ACCENT, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  saveMiniT: { color: '#fff', fontWeight: '700' },
});
