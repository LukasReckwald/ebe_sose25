// components/GeoPlaylistManager.tsx
import React, { useState, useEffect } from 'react';
import {
    View, Text, Modal, ScrollView, TouchableOpacity,
    TextInput, Alert, StyleSheet, Image, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '@/firebaseConfig';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { getValidSpotifyTokens, spotifyAPICall } from '@/utils/spotifyToken';

interface GeoPlaylistManagerProps {
    visible: boolean;
    onClose: () => void;
    geoPlaylists: GeoPlaylist[];
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
    currentTrack?: any;
    activeGeoPlaylists: string[];
}

interface GeoPlaylist {
    id: string;
    name: string;
    location: { latitude: number; longitude: number };
    radius: number;
    spotifyPlaylistId: string;
    spotifyPlaylistName: string;
    spotifyPlaylistImage?: string;
    isActive: boolean;
    userId: string;
    createdAt: any;
    sharedWith?: string[];
}

export const GeoPlaylistManager: React.FC<GeoPlaylistManagerProps> = ({
                                                                          visible,
                                                                          onClose,
                                                                          geoPlaylists,
                                                                          onToggle,
                                                                          onDelete,
                                                                          currentTrack,
                                                                          activeGeoPlaylists
                                                                      }) => {
    const [showAddSongModal, setShowAddSongModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [selectedPlaylistForAction, setSelectedPlaylistForAction] = useState<GeoPlaylist | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [shareEmail, setShareEmail] = useState('');

    const searchTracks = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const data = await spotifyAPICall(`/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=20`);
            setSearchResults(data.tracks.items);
        } catch (error) {
            Alert.alert('Suchfehler', 'Fehler beim Suchen von Tracks.');
        } finally {
            setIsSearching(false);
        }
    };

    const addCurrentTrackToPlaylist = async (geoPlaylist: GeoPlaylist) => {
        if (!currentTrack) {
            Alert.alert('Kein Track', 'Es wird gerade kein Song abgespielt.');
            return;
        }

        try {
            await spotifyAPICall(`/playlists/${geoPlaylist.spotifyPlaylistId}/tracks`, {
                method: 'POST',
                body: JSON.stringify({ uris: [currentTrack.uri] }),
            });

            Alert.alert(
                'Song hinzugefügt!',
                `"${currentTrack.name}" wurde zu "${geoPlaylist.name}" hinzugefügt.`
            );
        } catch (error) {
            Alert.alert('Fehler', 'Song konnte nicht hinzugefügt werden.');
        }
    };

    const addTrackToPlaylist = async (trackUri: string, trackName: string) => {
        if (!selectedPlaylistForAction) return;

        try {
            await spotifyAPICall(`/playlists/${selectedPlaylistForAction.spotifyPlaylistId}/tracks`, {
                method: 'POST',
                body: JSON.stringify({ uris: [trackUri] }),
            });

            Alert.alert(
                'Song hinzugefügt!',
                `"${trackName}" wurde zu "${selectedPlaylistForAction.name}" hinzugefügt.`
            );

            setShowAddSongModal(false);
            setSearchQuery('');
            setSearchResults([]);
        } catch (error) {
            Alert.alert('Fehler', 'Song konnte nicht hinzugefügt werden.');
        }
    };

    const sharePlaylist = async () => {
        if (!selectedPlaylistForAction || !shareEmail.trim()) {
            Alert.alert('Fehler', 'Bitte alle Felder ausfüllen.');
            return;
        }

        try {
            const db = getFirestore();

            // Suche nach User mit dieser Email
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', shareEmail.trim()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                Alert.alert('User nicht gefunden', 'Kein User mit dieser Email gefunden.');
                return;
            }

            const targetUser = querySnapshot.docs[0];
            const targetUserId = targetUser.id;

            // Erstelle Einladung
            const invitation = {
                from: auth.currentUser?.uid,
                to: targetUserId,
                geoPlaylistId: selectedPlaylistForAction.id,
                geoPlaylistName: selectedPlaylistForAction.name,
                spotifyPlaylistId: selectedPlaylistForAction.spotifyPlaylistId,
                status: 'pending',
                createdAt: new Date()
            };

            await addDoc(collection(db, 'geoPlaylistInvitations'), invitation);

            Alert.alert('Einladung gesendet!', `Einladung wurde an ${shareEmail} gesendet.`);
            setShowShareModal(false);
            setShareEmail('');
        } catch (error) {
            console.error('Error sharing playlist:', error);
            Alert.alert('Fehler', 'Playlist konnte nicht geteilt werden.');
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Geo-Playlisten</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalContent}>
                    {/* Aktuelle Playlisten im Radius */}
                    {activeGeoPlaylists.length > 0 && (
                        <View style={styles.activeSection}>
                            <Text style={styles.sectionTitle}>🎵 Aktive Playlisten</Text>
                            {geoPlaylists
                                .filter(p => activeGeoPlaylists.includes(p.id))
                                .map(playlist => (
                                    <View key={playlist.id} style={styles.activePlaylistCard}>
                                        <Image
                                            source={{ uri: playlist.spotifyPlaylistImage || 'https://via.placeholder.com/50' }}
                                            style={styles.playlistImage}
                                        />
                                        <View style={styles.playlistInfo}>
                                            <Text style={styles.playlistName}>{playlist.name}</Text>
                                            <Text style={styles.playlistSpotify}>{playlist.spotifyPlaylistName}</Text>
                                        </View>
                                        <View style={styles.quickActions}>
                                            <TouchableOpacity
                                                style={styles.quickActionButton}
                                                onPress={() => {
                                                    setSelectedPlaylistForAction(playlist);
                                                    setShowAddSongModal(true);
                                                }}
                                            >
                                                <Ionicons name="add" size={16} color="white" />
                                            </TouchableOpacity>
                                            {currentTrack && (
                                                <TouchableOpacity
                                                    style={[styles.quickActionButton, styles.currentTrackButton]}
                                                    onPress={() => addCurrentTrackToPlaylist(playlist)}
                                                >
                                                    <Ionicons name="musical-note" size={16} color="white" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                ))}
                        </View>
                    )}

                    {/* Alle Playlisten */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Alle Geo-Playlisten</Text>
                        {geoPlaylists.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="musical-notes-outline" size={64} color="#9CA3AF" />
                                <Text style={styles.emptyStateTitle}>Keine Geo-Playlisten</Text>
                                <Text style={styles.emptyStateText}>Erstelle deine erste Geo-Playlist!</Text>
                            </View>
                        ) : (
                            geoPlaylists.map((playlist) => (
                                <View key={playlist.id} style={styles.playlistCard}>
                                    <Image
                                        source={{ uri: playlist.spotifyPlaylistImage || 'https://via.placeholder.com/60' }}
                                        style={styles.playlistImage}
                                    />
                                    <View style={styles.playlistInfo}>
                                        <Text style={styles.playlistName}>{playlist.name}</Text>
                                        <Text style={styles.playlistSpotify}>{playlist.spotifyPlaylistName}</Text>
                                        <Text style={styles.playlistDetails}>
                                            Radius: {playlist.radius}m • {playlist.isActive ? 'Aktiv' : 'Inaktiv'}
                                        </Text>
                                    </View>
                                    <View style={styles.playlistActions}>
                                        <TouchableOpacity
                                            style={styles.shareButton}
                                            onPress={() => {
                                                setSelectedPlaylistForAction(playlist);
                                                setShowShareModal(true);
                                            }}
                                        >
                                            <Ionicons name="share" size={16} color="white" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.toggleButton, playlist.isActive && styles.toggleButtonActive]}
                                            onPress={() => onToggle(playlist.id)}
                                        >
                                            <Ionicons
                                                name={playlist.isActive ? "pause" : "play"}
                                                size={16}
                                                color="white"
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.deleteButton}
                                            onPress={() => onDelete(playlist.id)}
                                        >
                                            <Ionicons name="trash" size={16} color="white" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                </ScrollView>

                {/* Add Song Modal */}
                <Modal visible={showAddSongModal} animationType="slide" presentationStyle="pageSheet">
                    <SafeAreaView style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Song hinzufügen</Text>
                            <TouchableOpacity onPress={() => setShowAddSongModal(false)}>
                                <Ionicons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalContent}>
                            <Text style={styles.selectedPlaylistName}>
                                Zu: {selectedPlaylistForAction?.name}
                            </Text>

                            <View style={styles.searchContainer}>
                                <Ionicons name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
                                <TextInput
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    placeholder="Nach Songs suchen..."
                                    style={styles.searchInput}
                                    placeholderTextColor="#9CA3AF"
                                    onSubmitEditing={searchTracks}
                                />
                                <TouchableOpacity onPress={searchTracks} style={styles.searchButton}>
                                    <Ionicons name="search" size={18} color="white" />
                                </TouchableOpacity>
                            </View>

                            {isSearching && (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="small" color="#3B82F6" />
                                    <Text style={styles.loadingText}>Suche...</Text>
                                </View>
                            )}

                            <ScrollView style={styles.searchResults}>
                                {searchResults.map((track) => (
                                    <TouchableOpacity
                                        key={track.id}
                                        style={styles.trackRow}
                                        onPress={() => addTrackToPlaylist(track.uri, track.name)}
                                    >
                                        <Image
                                            source={{ uri: track.album.images?.[0]?.url || 'https://via.placeholder.com/40' }}
                                            style={styles.trackArtwork}
                                        />
                                        <View style={styles.trackDetails}>
                                            <Text style={styles.trackTitle} numberOfLines={1}>{track.name}</Text>
                                            <Text style={styles.trackArtist} numberOfLines={1}>
                                                {track.artists.map((a: any) => a.name).join(', ')}
                                            </Text>
                                        </View>
                                        <TouchableOpacity style={styles.addButton}>
                                            <Ionicons name="add" size={18} color="#3B82F6" />
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </SafeAreaView>
                </Modal>

                {/* Share Modal */}
                <Modal visible={showShareModal} animationType="slide" presentationStyle="pageSheet">
                    <SafeAreaView style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Playlist teilen</Text>
                            <TouchableOpacity onPress={() => setShowShareModal(false)}>
                                <Ionicons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalContent}>
                            <Text style={styles.selectedPlaylistName}>
                                Teile: {selectedPlaylistForAction?.name}
                            </Text>

                            <View style={styles.inputSection}>
                                <Text style={styles.inputLabel}>Email des Users</Text>
                                <TextInput
                                    value={shareEmail}
                                    onChangeText={setShareEmail}
                                    placeholder="user@example.com"
                                    style={styles.textInput}
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.shareCompleteButton, !shareEmail.trim() && styles.buttonDisabled]}
                                onPress={sharePlaylist}
                                disabled={!shareEmail.trim()}
                            >
                                <Text style={styles.shareButtonText}>Einladung senden</Text>
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </Modal>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
        backgroundColor: "white",
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: "#1F2937",
    },
    modalContent: {
        flex: 1,
        padding: 20,
    },
    activeSection: {
        marginBottom: 30,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 16,
    },
    activePlaylistCard: {
        flexDirection: "row",
        backgroundColor: "#EBF8FF",
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#3B82F6",
    },
    playlistCard: {
        flexDirection: "row",
        backgroundColor: "white",
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    playlistImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
    },
    playlistInfo: {
        flex: 1,
        marginLeft: 12,
    },
    playlistName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 4,
    },
    playlistSpotify: {
        fontSize: 14,
        color: "#3B82F6",
        marginBottom: 4,
    },
    playlistDetails: {
        fontSize: 12,
        color: "#6B7280",
    },
    playlistActions: {
        flexDirection: "row",
        gap: 8,
    },
    quickActions: {
        flexDirection: "row",
        gap: 8,
    },
    quickActionButton: {
        backgroundColor: "#3B82F6",
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    currentTrackButton: {
        backgroundColor: "#10B981",
    },
    shareButton: {
        backgroundColor: "#8B5CF6",
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    toggleButton: {
        backgroundColor: "#6B7280",
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    toggleButtonActive: {
        backgroundColor: "#10B981",
    },
    deleteButton: {
        backgroundColor: "#DC2626",
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 60,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#4B5563",
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 14,
        color: "#6B7280",
        textAlign: "center",
    },
    selectedPlaylistName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 20,
        textAlign: "center",
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 44,
        marginBottom: 16,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: "#1F2937",
    },
    searchButton: {
        backgroundColor: "#3B82F6",
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 8,
    },
    loadingContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 20,
    },
    loadingText: {
        marginLeft: 8,
        color: "#6B7280",
    },
    searchResults: {
        flex: 1,
    },
    trackRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    trackArtwork: {
        width: 40,
        height: 40,
        borderRadius: 6,
        marginRight: 12,
    },
    trackDetails: {
        flex: 1,
    },
    trackTitle: {
        fontSize: 14,
        fontWeight: "500",
        color: "#1F2937",
        marginBottom: 2,
    },
    trackArtist: {
        fontSize: 12,
        color: "#6B7280",
    },
    addButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#EBF8FF",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#3B82F6",
    },
    inputSection: {
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        color: "#1F2937",
    },
    shareCompleteButton: {
        backgroundColor: "#8B5CF6",
        padding: 16,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 20,
    },
    buttonDisabled: {
        backgroundColor: "#9CA3AF",
    },
    shareButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "600",
    },
});