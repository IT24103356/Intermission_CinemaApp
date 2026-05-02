import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import {
  Animated,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Image,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';

const categories = [
  { id: 'All', label: 'All', icon: '🎬' },
  { id: 'Drama', label: 'Drama', icon: '🎭' },
  { id: 'Romance', label: 'Romance', icon: '♡' },
  { id: 'Action', label: 'Action', icon: '⚔️' },
  { id: 'Comedy', label: 'Comedy', icon: '😂' },
];

export default function MovieListScreen({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin';
  const tabBarHeight = useBottomTabBarHeight();

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [deletingId, setDeletingId] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [renderSearchDropdown, setRenderSearchDropdown] = useState(false);
  const dropdownAnim = useRef(new Animated.Value(0)).current;

  const fetchMovies = async () => {
    try {
      const res = await api.get('/movies');
      setMovies(res.data);
    } catch (err) {
      console.log('Error fetching movies:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMovies();
  };

  const filteredMovies = useMemo(() => {
    let result = movies;

    if (activeCategory !== 'All') {
      result = result.filter(movie =>
        (movie.genre || '').toLowerCase().includes(activeCategory.toLowerCase())
      );
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(movie => (movie.title || '').toLowerCase().includes(query));
    }

    return result;
  }, [movies, activeCategory, search]);

  const nowInCinemas = useMemo(
    () => filteredMovies.filter(movie => movie.status === 'Now Showing'),
    [filteredMovies]
  );

  const popularMovies = useMemo(
    () => [...filteredMovies].sort((a, b) => Number(b.isTrending) - Number(a.isTrending)),
    [filteredMovies]
  );

  const adminMovies = useMemo(() => {
    if (!search.trim()) return movies;
    const query = search.toLowerCase();
    return movies.filter(movie => (movie.title || '').toLowerCase().includes(query));
  }, [movies, search]);

  const searchSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return movies
      .filter(movie => (movie.title || '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [movies, search]);

  const showSearchDropdown = !isAdmin && searchFocused && search.trim().length > 0;

  useEffect(() => {
    if (showSearchDropdown) {
      setRenderSearchDropdown(true);
      Animated.timing(dropdownAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(dropdownAnim, {
      toValue: 0,
      duration: 130,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setRenderSearchDropdown(false);
    });
  }, [dropdownAnim, showSearchDropdown]);

  const handleDeleteMovie = movieId => {
    Alert.alert('Delete Movie', 'Are you sure you want to delete this movie?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeletingId(movieId);
            await api.delete(`/movies/${movieId}`);
            setMovies(prev => prev.filter(movie => movie._id !== movieId));
            Alert.alert('Success', 'Movie deleted successfully');
          } catch (err) {
            Alert.alert('Delete Failed', err.response?.data?.message || 'Unable to delete movie');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const renderPosterCard = ({ item }) => (
    <TouchableOpacity
      style={styles.posterCard}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('MovieDetail', { movieId: item._id })}
    >
      {item.posterUrl ? (
        <Image source={{ uri: item.posterUrl }} style={styles.posterImage} />
      ) : (
        <View style={styles.posterFallback}>
          <Text style={styles.posterFallbackEmoji}>🎬</Text>
        </View>
      )}
      <TouchableOpacity style={styles.posterAction}>
        <Text style={styles.posterActionText}>♡</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderPopularRow = ({ item }) => (
    <TouchableOpacity
      style={styles.popularRow}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('MovieDetail', { movieId: item._id })}
    >
      {item.posterUrl ? (
        <Image source={{ uri: item.posterUrl }} style={styles.popularPoster} />
      ) : (
        <View style={styles.popularPosterFallback}>
          <Text style={styles.posterFallbackEmoji}>🎬</Text>
        </View>
      )}

      <View style={styles.popularInfo}>
        <Text style={styles.popularTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.popularMeta} numberOfLines={1}>
          {item.genre} • {item.duration} min
        </Text>
        <View style={styles.badgeRow}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{item.status}</Text>
          </View>
          {item.isTrending && (
            <View style={styles.trendingBadge}>
              <Text style={styles.trendingBadgeText}>Trending</Text>
            </View>
          )}
          {isAdmin && item.status === 'Now Showing' && (
            <TouchableOpacity
              style={styles.inlineAction}
              onPress={() => navigation.navigate('CreateMovie', { movie: item })}
            >
              <Text style={styles.inlineActionText}>Edit</Text>
            </TouchableOpacity>
          )}
          {isAdmin && (
            <TouchableOpacity
              style={[styles.inlineAction, styles.deleteAction]}
              onPress={() => handleDeleteMovie(item._id)}
              disabled={deletingId === item._id}
            >
              {deletingId === item._id ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.inlineActionText}>Delete</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderAdminMovieRow = ({ item }) => (
    <TouchableOpacity
      style={styles.popularRow}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('MovieDetail', { movieId: item._id })}
    >
      {item.posterUrl ? (
        <Image source={{ uri: item.posterUrl }} style={styles.popularPoster} />
      ) : (
        <View style={styles.popularPosterFallback}>
          <Text style={styles.posterFallbackEmoji}>🎬</Text>
        </View>
      )}

      <View style={styles.popularInfo}>
        <Text style={styles.popularTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.popularMeta} numberOfLines={1}>
          {item.genre} • {item.duration} min
        </Text>
        <View style={styles.badgeRow}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{item.status}</Text>
          </View>
          {item.isTrending && (
            <View style={styles.trendingBadge}>
              <Text style={styles.trendingBadgeText}>Trending</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.inlineAction}
            onPress={() => navigation.navigate('CreateMovie', { movie: item })}
          >
            <Text style={styles.inlineActionText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.inlineAction, styles.deleteAction]}
            onPress={() => handleDeleteMovie(item._id)}
            disabled={deletingId === item._id}
          >
            {deletingId === item._id ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.inlineActionText}>Delete</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e50914" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: 28 + tabBarHeight }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e50914" />
        }
      >
        <View style={styles.topBanner}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Hello, {user?.name || 'User'}</Text>
              <Text style={styles.subtitle}>Let's book your favorite film</Text>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity style={styles.iconButton}>
                <Text style={styles.iconText}>⌕</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={logout}>
                <Text style={styles.iconText}>⎋</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TextInput
          style={styles.search}
          placeholder="Search movie title..."
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setTimeout(() => setSearchFocused(false), 140)}
        />
        {renderSearchDropdown && (
          <Animated.View
            style={[
              styles.searchDropdown,
              {
                opacity: dropdownAnim,
                transform: [
                  {
                    translateY: dropdownAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-6, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {searchSuggestions.length === 0 ? (
              <Text style={styles.searchDropdownEmpty}>No matching movies</Text>
            ) : (
              searchSuggestions.map(item => (
                <TouchableOpacity
                  key={item._id}
                  style={styles.searchDropdownItem}
                  onPress={() => {
                    setSearch(item.title || '');
                    setSearchFocused(false);
                    navigation.navigate('MovieDetail', { movieId: item._id });
                  }}
                >
                  <Text style={styles.searchDropdownItemTitle}>{item.title}</Text>
                  <Text style={styles.searchDropdownItemMeta}>
                    {item.genre} • {item.duration} min
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </Animated.View>
        )}

        {isAdmin ? (
          <>
            <View style={[styles.sectionHeader, styles.adminSectionHeader]}>
              <Text style={[styles.sectionTitle, styles.adminSectionTitle]}>All Movies</Text>
            </View>
            <FlatList
              data={adminMovies}
              keyExtractor={item => item._id}
              renderItem={renderAdminMovieRow}
              scrollEnabled={false}
              ListEmptyComponent={<Text style={styles.empty}>No movies found</Text>}
            />
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Categories</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={categories}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.categoryList}
              renderItem={({ item }) => {
                const active = activeCategory === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.categoryChip, active && styles.categoryChipActive]}
                    onPress={() => setActiveCategory(item.id)}
                  >
                    <Text style={styles.categoryIcon}>{item.icon}</Text>
                    <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Now in cinemas</Text>
              <TouchableOpacity>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            {nowInCinemas.length ? (
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={nowInCinemas}
                keyExtractor={item => item._id}
                renderItem={renderPosterCard}
                contentContainerStyle={styles.posterRail}
              />
            ) : (
              <Text style={styles.empty}>No current showings found</Text>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Popular Movies</Text>
              <TouchableOpacity>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={popularMovies}
              keyExtractor={item => item._id}
              renderItem={renderPopularRow}
              scrollEnabled={false}
              ListEmptyComponent={<Text style={styles.empty}>No movies found</Text>}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  content: { paddingTop: 8, paddingHorizontal: 16, paddingBottom: 28 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f0f' },
  topBanner: {
    backgroundColor: '#e50914',
    borderRadius: 28,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    marginBottom: 10,
    marginHorizontal: -24,
    borderWidth: 1,
    borderColor: '#c80712',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { color: '#fff', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#ffd7db', fontSize: 14, marginTop: 4 },
  headerButtons: { flexDirection: 'row', gap: 10 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  search: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 0,
    backgroundColor: '#0f0f0f',
  },
  searchDropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#151515',
  },
  searchDropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
  },
  searchDropdownItemTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchDropdownItemMeta: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  searchDropdownEmpty: {
    color: '#999',
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  sectionTitle: { color: '#fff', fontSize: 29, fontWeight: '700', marginTop: 22, marginBottom: 12 },
  adminSectionTitle: { marginTop: 0, marginBottom: 8 },
  categoryList: { paddingBottom: 8, gap: 10 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 6,
  },
  categoryChipActive: { borderColor: '#e50914', backgroundColor: '#2a1113' },
  categoryIcon: { fontSize: 13 },
  categoryLabel: { color: '#d5d5d5', fontSize: 13, fontWeight: '500' },
  categoryLabelActive: { color: '#fff' },
  sectionHeader: { marginTop: 18, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  adminSectionHeader: { marginTop: 6, marginBottom: 2 },
  seeAll: { color: '#e50914', fontSize: 15, fontWeight: '600' },
  posterRail: { paddingBottom: 2, gap: 12 },
  posterCard: {
    width: 154,
    height: 220,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#1c1c1c',
    position: 'relative',
  },
  posterImage: { width: '100%', height: '100%' },
  posterFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
  },
  posterFallbackEmoji: { fontSize: 30 },
  posterAction: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  posterActionText: { color: '#fff', fontSize: 14 },
  popularRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderRadius: 14,
    marginBottom: 8,
  },
  popularPoster: {
    width: 84,
    height: 108,
    borderRadius: 14,
    backgroundColor: '#1c1c1c',
  },
  popularPosterFallback: {
    width: 84,
    height: 108,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
  },
  popularInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  popularTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  popularMeta: { color: '#bcbcbc', fontSize: 13, marginTop: 5 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, alignItems: 'center' },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 7,
    backgroundColor: '#2a2a2a',
  },
  statusBadgeText: { color: '#dadada', fontSize: 11, fontWeight: '500' },
  trendingBadge: {
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 7,
    backgroundColor: '#2a2a2a',
  },
  trendingBadgeText: { color: '#dadada', fontSize: 11, fontWeight: '500' },
  inlineAction: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 7,
    backgroundColor: '#e50914',
    minWidth: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteAction: { backgroundColor: '#6d171c' },
  inlineActionText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  empty: { color: '#999', marginTop: 10, fontSize: 14 },
});