import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, RefreshControl, Image,
  KeyboardAvoidingView, Platform, Modal, Alert, ScrollView,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import {
  fetchPostFeed, fetchFollowing, followUser, fetchActivity, createPost, deletePost,
} from '../../services/api';
import type { Post, ActivityEvent } from '../../services/api';
import { useDeviceId } from '../../hooks/useDeviceId';
import { formatDate, formatTime, formatHandle, formatFriendCode } from '../../utils/format';

type Tab = 'feed' | 'amici';

export default function AmiciScreen() {
  const insets = useSafeAreaInsets();
  const userId = useDeviceId();

  const [tab, setTab] = useState<Tab>('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [following, setFollowing] = useState<{ userId: string; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!userId) return;
    if (!isRefresh) setLoading(true);
    try {
      const [feedData, followData] = await Promise.all([
        fetchPostFeed(userId),
        fetchFollowing(userId),
      ]);
      setPosts(feedData);
      setFollowing(followData);
    } catch {
      setPosts([]);
      setFollowing([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = () => { setRefreshing(true); load(true); };

  const handlePostCreated = (post: Post) => {
    setPosts((prev) => [post, ...prev]);
    setShowPostModal(false);
  };

  const handlePostDeleted = async (postId: string) => {
    if (!userId) return;
    Alert.alert('Elimina post', 'Sei sicuro?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina', style: 'destructive',
        onPress: async () => {
          await deletePost(postId, userId);
          setPosts((prev) => prev.filter((p) => p.id !== postId));
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Amici</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowPostModal(true)} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={24} color={Colors.accentLight} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowAddModal(true)} activeOpacity={0.8}>
            <Ionicons name="person-add-outline" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'feed' && styles.tabBtnActive]} onPress={() => setTab('feed')}>
          <Text style={[styles.tabLabel, tab === 'feed' && styles.tabLabelActive]}>Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'amici' && styles.tabBtnActive]} onPress={() => setTab('amici')}>
          <Text style={[styles.tabLabel, tab === 'amici' && styles.tabLabelActive]}>Segui ({following.length})</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {tab === 'feed' ? (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              ownUserId={userId ?? ''}
              onDelete={handlePostDeleted}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: Colors.cardBorder, marginHorizontal: 20 }} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.accent} />}
          ListEmptyComponent={<EmptyFeed onAddFriend={() => setShowAddModal(true)} onPost={() => setShowPostModal(true)} />}
        />
      ) : (
        <FlatList
          data={following}
          keyExtractor={(f) => f.userId}
          renderItem={({ item }) => <FriendRow userId={item.userId} since={item.createdAt} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.accent} />}
          ListEmptyComponent={<EmptyFriends onAdd={() => setShowAddModal(true)} />}
        />
      )}

      {/* Add friend modal */}
      <AddFriendModal
        visible={showAddModal}
        userId={userId ?? ''}
        onClose={() => setShowAddModal(false)}
        onAdded={() => { setShowAddModal(false); load(); }}
      />

      {/* Create post modal */}
      {showPostModal && (
        <CreatePostModal
          userId={userId ?? ''}
          onClose={() => setShowPostModal(false)}
          onCreated={handlePostCreated}
        />
      )}
    </View>
  );
}

// ─── Post card ────────────────────────────────────────────────────────────────

function PostCard({ post, ownUserId, onDelete }: { post: Post; ownUserId: string; onDelete: (id: string) => void }) {
  const BASE   = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
  const isOwn  = post.userId === ownUserId;
  const handle = formatHandle(post.userId);
  const displayName = post.authorDisplayName ?? null;
  const avatarSrc   = post.authorAvatarUrl ? `${BASE}${post.authorAvatarUrl}` : null;

  return (
    <View style={pcStyles.card}>
      {/* Author row */}
      <View style={pcStyles.authorRow}>
        {/* Avatar */}
        {avatarSrc ? (
          <Image source={{ uri: avatarSrc }} style={pcStyles.avatar} />
        ) : (
          <View style={pcStyles.avatar}>
            <Ionicons name="person" size={14} color={Colors.accentLight} />
          </View>
        )}
        <View style={pcStyles.authorInfo}>
          <Text style={pcStyles.authorName}>{displayName ?? handle}</Text>
          {displayName && <Text style={pcStyles.authorHandle}>{handle}</Text>}
          <Text style={pcStyles.ts}>{new Date(post.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
        {isOwn && (
          <TouchableOpacity onPress={() => onDelete(post.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="trash-outline" size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Event tag */}
      {post.eventTitle && (
        <View style={pcStyles.eventTag}>
          <Ionicons name="location-outline" size={12} color={Colors.accentLight} />
          <Text style={pcStyles.eventTagText} numberOfLines={1}>{post.eventTitle}</Text>
          {post.eventDate && <Text style={pcStyles.eventTagSub}> · {formatDate(post.eventDate)}</Text>}
        </View>
      )}

      {/* Media */}
      {post.mediaUrl && (
        <Image
          source={{ uri: `${BASE}${post.mediaUrl}` }}
          style={pcStyles.media}
          resizeMode="cover"
        />
      )}

      {/* Caption */}
      {post.caption ? <Text style={pcStyles.caption}>{post.caption}</Text> : null}
    </View>
  );
}

const pcStyles = StyleSheet.create({
  card:         { paddingHorizontal: 20, paddingVertical: 16, gap: 10 },
  authorRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:       { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.accentDim, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  authorInfo:   { flex: 1, gap: 1 },
  authorName:   { fontSize: 13, fontWeight: '700', color: Colors.text, letterSpacing: 0.2 },
  authorHandle: { fontSize: 11, color: Colors.textTertiary, letterSpacing: 0.2 },
  ts:           { fontSize: 11, color: Colors.textTertiary },
  eventTag:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: Colors.accentDim, borderRadius: 8, alignSelf: 'flex-start' },
  eventTagText:{ fontSize: 12, fontWeight: '600', color: Colors.accentLight, maxWidth: 200 },
  eventTagSub: { fontSize: 11, color: Colors.accentLight + 'AA' },
  media:      { width: '100%', aspectRatio: 4 / 3, borderRadius: 14, backgroundColor: Colors.surface },
  caption:    { fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },
});

// ─── Friend row ───────────────────────────────────────────────────────────────

function FriendRow({ userId, since }: { userId: string; since: string }) {
  return (
    <View style={frStyles.row}>
      <View style={frStyles.avatar}>
        <Ionicons name="person" size={18} color={Colors.accentLight} />
      </View>
      <View style={frStyles.info}>
        <Text style={frStyles.name}>{formatHandle(userId)}</Text>
        <Text style={frStyles.since}>Dal {new Date(since).toLocaleDateString('it-IT')}</Text>
      </View>
      <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
    </View>
  );
}

const frStyles = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.accentDim, alignItems: 'center', justifyContent: 'center' },
  info:   { flex: 1 },
  name:   { fontSize: 14, fontWeight: '700', color: Colors.text, letterSpacing: 0.3 },
  since:  { fontSize: 12, color: Colors.textTertiary },
});

// ─── Empty states ─────────────────────────────────────────────────────────────

function EmptyFeed({ onAddFriend, onPost }: { onAddFriend: () => void; onPost: () => void }) {
  return (
    <View style={emStyles.wrap}>
      <Ionicons name="newspaper-outline" size={52} color={Colors.textTertiary} />
      <Text style={emStyles.title}>Nessun post ancora</Text>
      <Text style={emStyles.body}>Aggiungi amici o condividi il tuo primo momento</Text>
      <View style={emStyles.row}>
        <TouchableOpacity style={[emStyles.btn, { backgroundColor: Colors.accentDim }]} onPress={onAddFriend}>
          <Ionicons name="person-add-outline" size={16} color={Colors.accentLight} />
          <Text style={[emStyles.btnText, { color: Colors.accentLight }]}>Aggiungi amico</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[emStyles.btn, { backgroundColor: Colors.accent }]} onPress={onPost}>
          <Ionicons name="add-circle-outline" size={16} color={Colors.text} />
          <Text style={[emStyles.btnText, { color: Colors.text }]}>Nuovo post</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EmptyFriends({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={emStyles.wrap}>
      <Ionicons name="people-outline" size={52} color={Colors.textTertiary} />
      <Text style={emStyles.title}>Nessun amico ancora</Text>
      <Text style={emStyles.body}>Aggiungi amici con il loro codice Moody</Text>
      <TouchableOpacity style={[emStyles.btn, { backgroundColor: Colors.accent }]} onPress={onAdd}>
        <Ionicons name="person-add-outline" size={16} color={Colors.text} />
        <Text style={[emStyles.btnText, { color: Colors.text }]}>Aggiungi amico</Text>
      </TouchableOpacity>
    </View>
  );
}

const emStyles = StyleSheet.create({
  wrap:    { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32, gap: 10 },
  title:   { fontSize: 18, fontWeight: '700', color: Colors.text },
  body:    { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  row:     { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  btnText: { fontSize: 13, fontWeight: '700' },
});

// ─── Add friend modal ─────────────────────────────────────────────────────────

function AddFriendModal({ visible, userId, onClose, onAdded }: { visible: boolean; userId: string; onClose: () => void; onAdded: () => void }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    // Accept "@moody_xxxxxx", "moody_xxxxxx", or bare slug
    const clean = code.trim().toLowerCase().replace(/^@/, '').replace(/^moody_/, '');
    if (clean.length < 6) { setError('Codice non valido'); return; }

    setLoading(true);
    setError('');
    try {
      // The targetUserId is derived from the code — for MVP, user enters the full device UUID
      // or we accept the short code and the backend resolves it.
      // Here we pass the code as-is: it could be the short display code or full UUID.
      await followUser(userId, clean);
      onAdded();
      setCode('');
    } catch {
      setError('Utente non trovato o errore di rete');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={modalStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />
          <Text style={modalStyles.title}>Aggiungi un amico</Text>
          <Text style={modalStyles.sub}>Inserisci il codice Moody del tuo amico</Text>

          <View style={modalStyles.inputWrap}>
            <Ionicons name="person-add-outline" size={18} color={Colors.textTertiary} />
            <TextInput
              style={modalStyles.input}
              placeholder="Es. @moody_a1b2c3"
              placeholderTextColor={Colors.textTertiary}
              value={code}
              onChangeText={(t) => { setCode(t); setError(''); }}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {error ? <Text style={modalStyles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[modalStyles.confirmBtn, loading && { opacity: 0.6 }]}
            onPress={handleAdd}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator size="small" color={Colors.text} /> : (
              <>
                <Ionicons name="person-add" size={16} color={Colors.text} />
                <Text style={modalStyles.confirmBtnText}>Segui</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose}>
            <Text style={modalStyles.cancelText}>Annulla</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay:     { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:       { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 14 },
  handle:      { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 4 },
  title:       { fontSize: 20, fontWeight: '800', color: Colors.text },
  sub:         { fontSize: 14, color: Colors.textSecondary },
  inputWrap:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12 },
  input:       { flex: 1, fontSize: 15, color: Colors.text },
  error:       { fontSize: 13, color: Colors.danger },
  confirmBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 14 },
  confirmBtnText: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  cancelBtn:   { alignItems: 'center', paddingVertical: 10 },
  cancelText:  { fontSize: 15, color: Colors.textSecondary },
});

// ─── Create post modal ────────────────────────────────────────────────────────

function CreatePostModal({ userId, onClose, onCreated }: { userId: string; onClose: () => void; onCreated: (p: Post) => void }) {
  const insets = useSafeAreaInsets();
  const [caption, setCaption] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ActivityEvent | null>(null);
  const [userEvents, setUserEvents] = useState<ActivityEvent[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchActivity(userId)
      .then((a) => setUserEvents(a.events.filter((e) => e.isCheckedIn || e.isLiked)))
      .catch(() => {});
  }, [userId]);

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permesso richiesto', 'Consenti l\'accesso alla fotocamera nelle impostazioni.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length) setImageUri(result.assets[0].uri);
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permesso richiesto', 'Consenti l\'accesso alla galleria nelle impostazioni.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length) setImageUri(result.assets[0].uri);
  };

  const pickMedia = () => {
    Alert.alert(
      'Aggiungi foto o video',
      '',
      [
        { text: 'Fotocamera', onPress: openCamera },
        { text: 'Galleria', onPress: openGallery },
        { text: 'Annulla', style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  const handleSave = async () => {
    if (!caption.trim() && !imageUri && !selectedEvent) {
      Alert.alert('Post vuoto', 'Aggiungi un testo, una foto o seleziona un evento.');
      return;
    }
    setSaving(true);
    try {
      const post = await createPost({ userId, eventId: selectedEvent?.id, caption: caption.trim(), imageUri: imageUri ?? undefined });
      onCreated(post);
    } catch {
      Alert.alert('Errore', 'Impossibile pubblicare il post. Riprova.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: Colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Nav bar */}
        <View style={[cpStyles.nav, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={cpStyles.navCancel}>Annulla</Text>
          </TouchableOpacity>
          <Text style={cpStyles.navTitle}>Nuovo post</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={[cpStyles.navPublish, saving && { opacity: 0.5 }]}>
            {saving ? <ActivityIndicator size="small" color={Colors.text} /> : <Text style={cpStyles.navPublishText}>Pubblica</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={cpStyles.content}>
          {/* Caption */}
          <TextInput
            style={cpStyles.captionInput}
            placeholder="Cosa vuoi condividere?"
            placeholderTextColor={Colors.textTertiary}
            value={caption}
            onChangeText={setCaption}
            multiline
            numberOfLines={4}
          />

          {/* Image preview or picker */}
          <TouchableOpacity style={cpStyles.mediaPicker} onPress={pickMedia} activeOpacity={0.8}>
            {imageUri ? (
              <View>
                <Image source={{ uri: imageUri }} style={cpStyles.mediaPreview} resizeMode="cover" />
                <View style={cpStyles.mediaChangeOverlay}>
                  <Ionicons name="camera" size={16} color="#fff" />
                  <Text style={cpStyles.mediaChangeText}>Cambia</Text>
                </View>
              </View>
            ) : (
              <View style={cpStyles.mediaPlaceholder}>
                <View style={cpStyles.mediaIconRow}>
                  <Ionicons name="camera-outline" size={26} color={Colors.textSecondary} />
                  <View style={cpStyles.mediaIconDivider} />
                  <Ionicons name="image-outline" size={26} color={Colors.textSecondary} />
                </View>
                <Text style={cpStyles.mediaPlaceholderText}>Fotocamera o Galleria</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Event selector */}
          {userEvents.length > 0 && (
            <View style={cpStyles.eventSection}>
              <Text style={cpStyles.sectionLabel}>TAGGA UN EVENTO</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {userEvents.map((ev) => {
                  const active = selectedEvent?.id === ev.id;
                  return (
                    <TouchableOpacity
                      key={ev.id}
                      style={[cpStyles.eventChip, active && cpStyles.eventChipActive]}
                      onPress={() => setSelectedEvent(active ? null : ev)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name={ev.isCheckedIn ? 'checkmark-circle' : 'heart'} size={12} color={active ? Colors.accentLight : Colors.textTertiary} />
                      <Text style={[cpStyles.eventChipText, active && cpStyles.eventChipTextActive]} numberOfLines={1}>
                        {ev.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const cpStyles = StyleSheet.create({
  nav:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  navCancel:      { fontSize: 15, color: Colors.textSecondary },
  navTitle:       { fontSize: 16, fontWeight: '700', color: Colors.text },
  navPublish:     { backgroundColor: Colors.accent, paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  navPublishText: { fontSize: 14, fontWeight: '700', color: Colors.text },
  content:        { padding: 20, gap: 20, paddingBottom: 60 },
  captionInput:   { fontSize: 16, color: Colors.text, minHeight: 100, textAlignVertical: 'top', lineHeight: 24 },
  mediaPicker:    { borderRadius: 16, overflow: 'hidden', borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed' },
  mediaPreview:       { width: '100%', aspectRatio: 4 / 3 },
  mediaChangeOverlay: { position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  mediaChangeText:    { fontSize: 13, fontWeight: '600', color: '#fff' },
  mediaPlaceholder:     { height: 130, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.surface },
  mediaPlaceholderText: { fontSize: 14, color: Colors.textSecondary },
  mediaIconRow:         { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mediaIconDivider:     { width: 1, height: 20, backgroundColor: Colors.border },
  eventSection:   { gap: 10 },
  sectionLabel:   { fontSize: 11, fontWeight: '700', color: Colors.textTertiary, letterSpacing: 1 },
  eventChip:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface, maxWidth: 180 },
  eventChipActive:{ backgroundColor: Colors.accentDim, borderColor: Colors.accent },
  eventChipText:  { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, flexShrink: 1 },
  eventChipTextActive: { color: Colors.accentLight },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title:     { fontSize: 28, fontWeight: '800', color: Colors.text, letterSpacing: -0.5, flex: 1 },
  headerActions: { flexDirection: 'row', gap: 4 },
  iconBtn:   { padding: 6 },
  tabRow:    { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 8 },
  tabBtn:    { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99, borderWidth: 1.5, borderColor: Colors.border },
  tabBtnActive: { backgroundColor: Colors.accentDim, borderColor: Colors.accent },
  tabLabel:  { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  tabLabelActive: { color: Colors.accentLight },
  list:      { paddingBottom: 110 },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
