import React, { useState, useCallback, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';

const BG = '#0f0f0f';
const CARD = '#1c1c1c';
const BORDER = '#2a2a2a';
const ACCENT = '#e50914';
const MUTED = '#888';

function statusStyle(st) {
  if (st === 'approved') return { bg: 'rgba(46,160,67,0.2)', color: '#3fb950' };
  if (st === 'rejected') return { bg: 'rgba(196,68,68,0.2)', color: '#c44' };
  return { bg: 'rgba(255,200,0,0.12)', color: '#d4a017' };
}

function hasVoted(s, userId) {
  if (!userId || !s?.votedBy?.length) return false;
  return s.votedBy.some(id => String(id) === String(userId));
}

function isOwner(s, userId) {
  if (!userId) return false;
  const uid = s.user?._id != null ? s.user._id : s.user;
  return String(uid) === String(userId);
}

export default function SuggestionScreen() {
  const { user } = useContext(AuthContext);
  const tabBarHeight = useBottomTabBarHeight();
  const userId = user?._id;

  const [tab, setTab] = useState('all');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [votingId, setVotingId] = useState(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const load = useCallback(async () => {
    try {
      if (tab === 'mine' && user) {
        const res = await api.get('/suggestions/my');
        setList(Array.isArray(res.data) ? res.data : []);
      } else {
        const res = await api.get('/suggestions');
        setList(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      setList([]);
      if (tab === 'mine' && err.response?.status === 401) {
        /* not logged in */
      } else {
        console.warn(err.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const submit = async () => {
    if (!user) {
      Alert.alert('Sign in', 'Log in to suggest a movie.');
      return;
    }
    const t = title.trim();
    if (t.length < 2) {
      Alert.alert('Title', 'Enter a movie title (at least 2 characters).');
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/suggestions', {
        movieTitle: t,
        description: description.trim() || undefined,
      });
      setTitle('');
      setDescription('');
      setTab('mine');
      const mine = await api.get('/suggestions/my');
      setList(Array.isArray(mine.data) ? mine.data : []);
      Alert.alert('Submitted', 'Your request is on the list. Others can upvote it.');
    } catch (err) {
      Alert.alert('Could not submit', err.response?.data?.message || 'Try again');
    } finally {
      setSubmitting(false);
    }
  };

  const vote = async id => {
    if (!user) return;
    try {
      setVotingId(id);
      await api.put(`/suggestions/${id}/vote`);
      await load();
    } catch (err) {
      Alert.alert('Vote', err.response?.data?.message || 'Could not vote');
    } finally {
      setVotingId(null);
    }
  };

  const removeSuggestion = s => {
    Alert.alert('Remove request', 'Delete this movie request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/suggestions/${s._id}`);
            await load();
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Delete failed');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item: s }) => {
    const own = isOwner(s, userId);
    const voted = hasVoted(s, userId);
    const st = statusStyle(s.status);
    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHead}>
          <Text style={styles.requestTitle} numberOfLines={2}>
            {s.movieTitle}
          </Text>
          <View style={[styles.badge, { backgroundColor: st.bg }]}>
            <Text style={[styles.badgeT, { color: st.color }]}>
              {s.status === 'pending' ? 'Pending' : s.status}
            </Text>
          </View>
        </View>
        {s.user?.name && (
          <Text style={styles.byLine}>By {s.user.name}</Text>
        )}
        {s.description ? (
          <Text style={styles.desc}>{s.description}</Text>
        ) : null}
        <View style={styles.requestFoot}>
          <Text style={styles.votes}>{s.votes ?? 0} votes</Text>
          {user && !own && s.status === 'pending' && (
            <TouchableOpacity
              style={[styles.voteBtn, (voted || votingId === s._id) && styles.voteBtnOff]}
              onPress={() => !voted && vote(s._id)}
              disabled={voted || votingId === s._id}
            >
              {votingId === s._id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.voteBtnT}>{voted ? 'Voted' : 'Upvote'}</Text>
              )}
            </TouchableOpacity>
          )}
          {user && own && s.status === 'pending' && (
            <TouchableOpacity onPress={() => removeSuggestion(s)}>
              <Text style={styles.dangerT}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const padTop = 8;
  const padBottom = tabBarHeight + 24;
  const showMine = tab === 'mine';

  return (
    <View style={[styles.root, { paddingTop: padTop }]}>
      <View style={styles.headerBlock}>
        <View style={styles.topBanner}>
          <View style={styles.bannerHeader}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Movies')}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <View style={styles.bannerTextWrap}>
              <Text style={styles.h1}>Movie requests</Text>
              <Text style={styles.bannerCaption}>
                Suggest a title for our lineup. The community can upvote and staff can review requests.
              </Text>
            </View>
          </View>
        </View>

        {user && (
          <View style={styles.formCard}>
            <Text style={styles.label}>Movie title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Dune: Part Three"
              placeholderTextColor="#666"
            />
            <Text style={styles.label}>Why it should play (optional)</Text>
            <TextInput
              style={styles.textArea}
              value={description}
              onChangeText={setDescription}
              placeholder="Short reason…"
              placeholderTextColor="#666"
              multiline
            />
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.btnDis]}
              onPress={submit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitT}>Submit request</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, !showMine && styles.tabOn]}
            onPress={() => setTab('all')}
          >
            <Text style={[styles.tabT, !showMine && styles.tabTOn]}>All requests</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, showMine && styles.tabOn]}
            onPress={() => {
              if (!user) {
                Alert.alert('Sign in', 'Log in to see your requests.');
                return;
              }
              setTab('mine');
            }}
          >
            <Text style={[styles.tabT, showMine && styles.tabTOn]}>My requests</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: padBottom, flexGrow: 1 }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {showMine
                ? 'You haven’t submitted a request yet.'
                : 'No requests yet. Be the first to suggest a movie!'}
            </Text>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  headerBlock: { paddingHorizontal: 20 },
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
  caption: { color: MUTED, fontSize: 14, marginTop: 8, marginBottom: 16, lineHeight: 20 },
  formCard: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
  },
  label: { color: MUTED, fontSize: 12, marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 80,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 15,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  submitBtn: { backgroundColor: ACCENT, borderRadius: 12, padding: 16, alignItems: 'center' },
  submitT: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDis: { opacity: 0.7 },
  tabs: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, alignItems: 'center' },
  tabOn: { borderColor: ACCENT, backgroundColor: 'rgba(229,9,20,0.12)' },
  tabT: { color: MUTED, fontWeight: '600', fontSize: 14 },
  tabTOn: { color: ACCENT },
  centered: { flex: 1, justifyContent: 'center' },
  requestCard: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
  },
  requestHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 4 },
  requestTitle: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '600' },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeT: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  byLine: { color: MUTED, fontSize: 12, marginBottom: 6 },
  desc: { color: '#ccc', fontSize: 14, lineHeight: 20, marginBottom: 10 },
  requestFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  votes: { color: MUTED, fontSize: 13, fontWeight: '600' },
  voteBtn: { backgroundColor: ACCENT, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, minWidth: 88, alignItems: 'center' },
  voteBtnOff: { backgroundColor: '#333' },
  voteBtnT: { color: '#fff', fontWeight: '700', fontSize: 14 },
  dangerT: { color: '#c44', fontWeight: '600', fontSize: 14 },
  empty: { color: MUTED, textAlign: 'center', marginTop: 32, fontSize: 15 },
});
