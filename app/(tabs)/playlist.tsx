import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, Image, TouchableOpacity, ScrollView,
    Alert, StyleSheet, SafeAreaView, ActivityIndicator
} from 'react-native';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '@/firebaseConfig';
import { router } from 'expo-router';
import {
    getValidSpotifyTokens,
    spotifyAPICall,
    clearSpotifyTokens,
    SpotifyTokens
} from '@/utils/spotifyTokenUtils';

// Diese Komponente ist für /(tabs)/playlist
export default function PlaylistScreen() {
    // Token Management
    const [tokens, setTokens] = useState<SpotifyTokens | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // App State
    const [userProfile, setUserProfile] = useState<any>(null);
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);
    const [playlistTracks, setPlaylistTracks] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [newPlaylistName, setNewPlaylistName] = useState<string>('');
    const [currentTrack, setCurrentTrack] = useState<any>(null);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);

    useEffect(() => {
        // Überprüfe Firebase Auth Status
        if (!auth.currentUser) {
            router.push('/login');
            return;
        }

        // Lade und validiere Spotify-Tokens
        loadAndValidateTokens();
    }, []);

    useEffect(() => {
        if (tokens) {
            initializeApp();
        } else if (!isLoading) {
            // Keine gültigen Tokens - zurück zur Auth
            router.push('/spotify-auth');
        }
    }, [tokens, isLoading]);

    // Lade und validiere Tokens
    const loadAndValidateTokens = async () => {
        try {
            const validTokens = await getValidSpotifyTokens();
            setTokens(validTokens);
        } catch (error) {
            console.error('Fehler beim Laden der Tokens:', error);
            setTokens(null);
        } finally {
            setIsLoading(false);
        }
    };

    // App initialisieren
    const initializeApp = async () => {
        try {
            await fetchProfile();
            await fetchPlaylists();
            fetchCurrentPlayback();

            // Starte Playback-Polling
            const interval = setInterval(fetchCurrentPlayback, 5000);
            return () => clearInterval(interval);
        } catch (error) {
            console.error('Fehler bei der App-Initialisierung:', error);
        }
    };

    // Spotify API Wrapper - jetzt vereinfacht
    const spotifyAPI = async (endpoint: string, options: any = {}) => {
        return await spotifyAPICall(endpoint, options);
    };

    // API Funktionen
    const fetchProfile = async () => {
        const profile = await spotifyAPI('/me');
        setUserProfile(profile);
    };

    const fetchPlaylists = async () => {
        const data = await spotifyAPI('/me/playlists');
        setPlaylists(data.items);
    };

    const fetchPlaylistTracks = async (playlistId: string) => {
        const data = await spotifyAPI(`/playlists/${playlistId}/tracks`);
        setPlaylistTracks(data.items);
    };

    const fetchCurrentPlayback = async () => {
        try {
            const data = await spotifyAPI('/me/player');
            setCurrentTrack(data.item);
            setIsPlaying(data.is_playing);
        } catch (error) {
            setCurrentTrack(null);
            setIsPlaying(false);
        }
    };

    const togglePlayPause = async () => {
        try {
            const endpoint = isPlaying ? '/me/player/pause' : '/me/player/play';
            await spotifyAPI(endpoint, { method: 'PUT' });
            setIsPlaying(!isPlaying);
        } catch (error) {
            // Prüfe ob wirklich ein Gerät fehlt
            try {
                const devices = await spotifyAPI('/me/player/devices');
                if (devices.devices.length === 0) {
                    Alert.alert('Kein Gerät verfügbar', 'Bitte öffne Spotify auf einem Gerät.', [
                        { text: 'Spotify öffnen', onPress: () => Linking.openURL('spotify://') },
                        { text: 'OK' },
                    ]);
                } else {
                    // Ignoriere Fehler wenn Geräte vorhanden sind - wahrscheinlich hat es trotzdem funktioniert
                    console.log('Playback möglicherweise erfolgreich trotz API-Fehler');
                }
            } catch (deviceError) {
                Alert.alert('Playback-Fehler', 'Stelle sicher, dass Spotify auf einem Gerät läuft.');
            }
        }
    };

    const searchTracks = async () => {
        if (!searchQuery.trim()) return;
        try {
            const data = await spotifyAPI(`/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=10`);
            setSearchResults(data.tracks.items);
        } catch (error) {
            Alert.alert('Suchfehler', 'Fehler beim Suchen von Tracks.');
        }
    };

    const addTrackToPlaylist = async (trackUri: string) => {
        if (!selectedPlaylist) {
            return Alert.alert('Fehler', 'Bitte wähle zuerst eine Playlist aus.');
        }

        try {
            await spotifyAPI(`/playlists/${selectedPlaylist.id}/tracks`, {
                method: 'POST',
                body: JSON.stringify({ uris: [trackUri] }),
            });
            Alert.alert('Erfolg', 'Song wurde zur Playlist hinzugefügt!');
            fetchPlaylistTracks(selectedPlaylist.id);
            setSearchQuery('');
            setSearchResults([]);
        } catch (error) {
            Alert.alert('Fehler', 'Song konnte nicht hinzugefügt werden.');
        }
    };

    const createPlaylist = async () => {
        if (!newPlaylistName.trim()) {
            return Alert.alert('Fehler', 'Bitte gib einen Namen für die Playlist ein.');
        }
        if (!userProfile) {
            return Alert.alert('Fehler', 'Profil wird noch geladen...');
        }

        try {
            const name = newPlaylistName.trim();
            const data = await spotifyAPI(`/users/${userProfile.id}/playlists`, {
                method: 'POST',
                body: JSON.stringify({ name, public: true }),
            });
            Alert.alert('Erfolg', `Playlist "${data.name}" wurde erstellt!`);
            fetchPlaylists();
            setNewPlaylistName('');
        } catch (error) {
            Alert.alert('Fehler', 'Playlist konnte nicht erstellt werden.');
        }
    };

    const playPlaylist = async (playlistId: string) => {
        try {
            await spotifyAPI('/me/player/play', {
                method: 'PUT',
                body: JSON.stringify({ context_uri: `spotify:playlist:${playlistId}` }),
            });
            // Erfolgreich - keine Meldung nötig
        } catch (error) {
            // Prüfe ob wirklich ein Gerät fehlt
            try {
                const devices = await spotifyAPI('/me/player/devices');
                if (devices.devices.length === 0) {
                    Alert.alert('Kein Gerät verfügbar', 'Bitte öffne Spotify auf einem Gerät.', [
                        { text: 'Spotify öffnen', onPress: () => Linking.openURL('spotify://') },
                        { text: 'OK' },
                    ]);
                } else {
                    // Ignoriere Fehler wenn Geräte vorhanden sind
                    console.log('Playlist-Playback möglicherweise erfolgreich trotz API-Fehler');
                }
            } catch (deviceError) {
                Alert.alert('Playback-Fehler', 'Stelle sicher, dass Spotify auf einem Gerät geöffnet ist.');
            }
        }
    };

    const playTrackFromPlaylist = async (trackUri: string) => {
        try {
            await spotifyAPI('/me/player/play', {
                method: 'PUT',
                body: JSON.stringify({ uris: [trackUri] }),
            });
            // Erfolgreich - keine Meldung nötig
        } catch (error) {
            // Prüfe ob wirklich ein Gerät fehlt
            try {
                const devices = await spotifyAPI('/me/player/devices');
                if (devices.devices.length === 0) {
                    Alert.alert('Kein Gerät verfügbar', 'Bitte öffne Spotify auf einem Gerät.');
                } else {
                    // Ignoriere Fehler wenn Geräte vorhanden sind
                    console.log('Track-Playback möglicherweise erfolgreich trotz API-Fehler');
                }
            } catch (deviceError) {
                Alert.alert('Playback-Fehler', 'Stelle sicher, dass Spotify auf einem Gerät geöffnet ist.');
            }
        }
    };

    // Zur Auth zurück
    const goToAuth = () => {
        router.push('/spotify-auth');
    };

    // Zur Profile/Settings (falls du eine hast)
    const goToProfile = () => {
        router.push('/profile'); // oder deine Profile-Route
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator size="large" color="#1F2937" />
                <Text style={styles.loadingText}>Lade Playlists...</Text>
            </SafeAreaView>
        );
    }

    if (!tokens) {
        return (
            <SafeAreaView style={styles.center}>
                <Ionicons name="alert-circle" size={60} color="#DC2626" />
                <Text style={styles.errorTitle}>Spotify nicht verbunden</Text>
                <Text style={styles.errorText}>
                    Deine Spotify-Verbindung ist ungültig. Bitte verbinde dich erneut.
                </Text>
                <TouchableOpacity onPress={goToAuth} style={styles.reconnectBtn}>
                    <Text style={styles.btnText}>Neu verbinden</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.pageTitle}>Playlists</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={goToProfile} style={styles.iconButton}>
                        <Ionicons name="person-outline" size={20} color="#6B7280" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={goToAuth} style={styles.iconButton}>
                        <Ionicons name="settings-outline" size={20} color="#6B7280" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* User Profile Card */}
                {userProfile && (
                    <View style={styles.profileCard}>
                        <Image source={{ uri: userProfile.images?.[0]?.url }} style={styles.profileImage} />
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>{userProfile.display_name}</Text>
                            <Text style={styles.profileEmail}>{userProfile.email}</Text>
                        </View>
                        <View style={styles.spotifyBadge}>
                            <Ionicons name="logo-spotify" size={16} color="#1DB954" />
                            <Text style={styles.badgeText}>Connected</Text>
                        </View>
                    </View>
                )}

                {/* Search Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Search Music</Text>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search for songs..."
                            style={styles.searchInput}
                            placeholderTextColor="#9CA3AF"
                            onSubmitEditing={searchTracks}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                        <View style={styles.searchResults}>
                            {searchResults.map((item: any) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.trackRow}
                                    onPress={() => addTrackToPlaylist(item.uri)}
                                >
                                    <Image source={{ uri: item.album.images?.[0]?.url }} style={styles.trackArtwork} />
                                    <View style={styles.trackDetails}>
                                        <Text style={styles.trackTitle} numberOfLines={1}>{item.name}</Text>
                                        <Text style={styles.trackArtist} numberOfLines={1}>
                                            {item.artists.map((a: any) => a.name).join(', ')}
                                        </Text>
                                    </View>
                                    <TouchableOpacity style={styles.addButton}>
                                        <Ionicons name="add" size={18} color="#6B7280" />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Create Playlist Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Create Playlist</Text>
                    <View style={styles.inputGroup}>
                        <TextInput
                            value={newPlaylistName}
                            onChangeText={setNewPlaylistName}
                            placeholder="Playlist name..."
                            style={styles.textInput}
                            placeholderTextColor="#9CA3AF"
                        />
                        <TouchableOpacity
                            onPress={createPlaylist}
                            style={[styles.primaryButton, !newPlaylistName.trim() && styles.buttonDisabled]}
                            disabled={!newPlaylistName.trim()}
                        >
                            <Ionicons name="add" size={16} color="white" />
                            <Text style={styles.buttonText}>Create</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Horizontal Playlists ScrollView */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Your Playlists</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.playlistScrollContainer}
                    >
                        {playlists.map((playlist: any) => (
                            <TouchableOpacity
                                key={playlist.id}
                                style={[
                                    styles.playlistCard,
                                    selectedPlaylist?.id === playlist.id && styles.playlistCardSelected
                                ]}
                                onPress={() => {
                                    setSelectedPlaylist(playlist);
                                    fetchPlaylistTracks(playlist.id);
                                }}
                            >
                                <Image
                                    source={{ uri: playlist.images?.[0]?.url || 'https://via.placeholder.com/120' }}
                                    style={styles.playlistArtwork}
                                />
                                <View style={styles.playlistInfo}>
                                    <Text style={styles.playlistTitle} numberOfLines={2}>
                                        {playlist.name}
                                    </Text>
                                    <Text style={styles.playlistMeta}>
                                        {playlist.tracks.total} songs
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Selected Playlist Details */}
                {selectedPlaylist && (
                    <View style={styles.section}>
                        <View style={styles.playlistHeader}>
                            <Image
                                source={{ uri: selectedPlaylist.images?.[0]?.url || 'https://via.placeholder.com/80' }}
                                style={styles.selectedArtwork}
                            />
                            <View style={styles.selectedInfo}>
                                <Text style={styles.selectedTitle}>{selectedPlaylist.name}</Text>
                                <Text style={styles.selectedMeta}>
                                    {selectedPlaylist.tracks.total} songs • {selectedPlaylist.owner.display_name}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => playPlaylist(selectedPlaylist.id)}
                                    style={styles.playButton}
                                >
                                    <Ionicons name="play" size={14} color="white" />
                                    <Text style={styles.playButtonText}>Play</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Track List */}
                        <View style={styles.trackList}>
                            {playlistTracks.slice(0, 10).map(({ track }: any, index: number) => (
                                <TouchableOpacity
                                    key={`${track.id}-${index}`}
                                    style={styles.trackRow}
                                    onPress={() => playTrackFromPlaylist(track.uri)}
                                >
                                    <Text style={styles.trackNumber}>{index + 1}</Text>
                                    <Image source={{ uri: track.album.images?.[0]?.url }} style={styles.trackArtwork} />
                                    <View style={styles.trackDetails}>
                                        <Text style={styles.trackTitle} numberOfLines={1}>{track.name}</Text>
                                        <Text style={styles.trackArtist} numberOfLines={1}>
                                            {track.artists.map((a: any) => a.name).join(', ')}
                                        </Text>
                                    </View>
                                    <TouchableOpacity style={styles.playTrackButton}>
                                        <Ionicons name="play-outline" size={16} color="#6B7280" />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            ))}
                            {playlistTracks.length > 10 && (
                                <View style={styles.moreTracksIndicator}>
                                    <Text style={styles.moreTracksText}>
                                        +{playlistTracks.length - 10} more songs
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* Bottom Spacing für Now Playing Bar */}
                <View style={{ height: currentTrack ? 200 : 30 }} />
            </ScrollView>

            {/* Now Playing Bar */}
            {currentTrack && (
                <View style={styles.nowPlayingBar}>
                    <Image source={{ uri: currentTrack.album.images[0].url }} style={styles.nowPlayingArtwork} />
                    <View style={styles.nowPlayingInfo}>
                        <Text style={styles.nowPlayingTitle} numberOfLines={1}>{currentTrack.name}</Text>
                        <Text style={styles.nowPlayingArtist} numberOfLines={1}>
                            {currentTrack.artists.map((a: any) => a.name).join(', ')}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={togglePlayPause} style={styles.playPauseButton}>
                        <Ionicons
                            name={isPlaying ? "pause" : "play"}
                            size={20}
                            color="#374151"
                        />
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    // Container & Layout
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#4B5563',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: '#F9FAFB',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },

    // Profile Card
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginVertical: 16,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    profileImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    profileInfo: {
        flex: 1,
        marginLeft: 12,
    },
    profileName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4B5563',
        marginBottom: 2,
    },
    profileEmail: {
        fontSize: 14,
        color: '#6B7280',
    },
    spotifyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#34D399',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    badgeText: {
        fontSize: 12,
        color: 'white',
        fontWeight: '500',
    },

    // Sections
    section: {
        marginBottom: 32,
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#4B5563',
        marginBottom: 16,
    },

    // Search
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#4B5563',
        height: '100%',
    },
    clearButton: {
        marginLeft: 8,
    },
    searchResults: {
        marginTop: 16,
    },

    // Input Group
    inputGroup: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-end',
    },
    textInput: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        color: '#4B5563',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },

    // Buttons
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3B82F6',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        gap: 6,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    buttonDisabled: {
        backgroundColor: '#9CA3AF',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    playButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3B82F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        gap: 4,
        marginTop: 8,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    playButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },

    // Horizontal Playlist ScrollView
    playlistScrollContainer: {
        paddingLeft: 10, // Padding am Anfang des Scrollviews
        paddingRight: 20, // Padding am Ende des Scrollviews
        paddingBottom: 10, // Padding unten für Dropschadow
        paddingTop: 5, // Padding oben für Dropschadow
    },
    playlistCard: {
        width: 160, // Feste Breite für horizontales Scrolling
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        marginRight: 16, // Abstand zwischen den Karten
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    playlistCardSelected: {
        backgroundColor: '#3B82F6',
        borderWidth: 2,
        borderColor: '#3B82F6',
    },
    playlistArtwork: {
        width: '100%',
        height: 136, // Quadratisches Artwork
        borderRadius: 8,
        marginBottom: 8,
    },
    playlistInfo: {
        gap: 4,
    },
    playlistTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4B5563',
        lineHeight: 18,
    },
    playlistMeta: {
        fontSize: 12,
        color: '#6B7280',
    },

    // Selected Playlist
    playlistHeader: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    selectedArtwork: {
        width: 80,
        height: 80,
        borderRadius: 8,
    },
    selectedInfo: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },
    selectedTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#4B5563',
        marginBottom: 4,
    },
    selectedMeta: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 8,
    },

    // Track List
    trackList: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        overflow: 'hidden',
    },
    trackRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    trackNumber: {
        width: 24,
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginRight: 12,
    },
    trackArtwork: {
        width: 40,
        height: 40,
        borderRadius: 6,
        marginRight: 12,
    },
    trackDetails: {
        flex: 1,
        gap: 2,
    },
    trackTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#4B5563',
    },
    trackArtist: {
        fontSize: 12,
        color: '#6B7280',
    },
    addButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F9FAFB',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    playTrackButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F9FAFB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    moreTracksIndicator: {
        padding: 16,
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    moreTracksText: {
        fontSize: 12,
        color: '#6B7280',
        fontStyle: 'italic',
    },

    // Now Playing Bar
    nowPlayingBar: {
        position: 'absolute',
        left: 20,
        right: 20,
        bottom: 70,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    nowPlayingArtwork: {
        width: 48,
        height: 48,
        borderRadius: 6,
    },
    nowPlayingInfo: {
        flex: 1,
        marginLeft: 12,
        gap: 2,
    },
    nowPlayingTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#4B5563',
    },
    nowPlayingArtist: {
        fontSize: 12,
        color: '#6B7280',
    },
    playPauseButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Loading & Error States
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 20,
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 16,
    },
    errorTitle: {
        fontSize: 20,
        color: '#DC2626',
        marginVertical: 15,
        fontWeight: '600',
    },
    errorText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 22,
    },
    reconnectBtn: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    btnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});