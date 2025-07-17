import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, Image, TouchableOpacity, ScrollView,
    Alert, StyleSheet, ActivityIndicator, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '@/firebaseConfig';
import { router } from 'expo-router';
import {
    getValidSpotifyTokens,
    spotifyAPICall,
    clearSpotifyTokens,
    SpotifyTokens
} from '@/utils/spotifyToken';
import {
    getFirestore,
    collection,
    query,
    where,
    onSnapshot,
    doc,
    getDoc
} from 'firebase/firestore';
import * as Location from 'expo-location';

interface GeoPlaylist {
    id: string;
    name: string;
    location: {
        latitude: number;
        longitude: number;
    } | null;
    radius: number;
    spotifyPlaylistId: string;
    spotifyPlaylistName: string;
    spotifyPlaylistImage?: string;
    isActive: boolean;
    userId: string;
    createdAt: any;
    sharedWith?: string[];
    isShared?: boolean;
    originalOwnerId?: string;
}

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

    // GeoPlaylist Features
    const [geoPlaylists, setGeoPlaylists] = useState<GeoPlaylist[]>([]);
    const [activeGeoPlaylists, setActiveGeoPlaylists] = useState<GeoPlaylist[]>([]);
    const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
    const [showQuickAddModal, setShowQuickAddModal] = useState(false);
    const [quickAddTrack, setQuickAddTrack] = useState<any>(null);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (!auth.currentUser) {
            router.push('/login');
            return;
        }

        loadAndValidateTokens();
        loadGeoPlaylists();
        startLocationTracking();
    }, []);

    useEffect(() => {
        if (tokens) {
            initializeApp();
        } else if (!isLoading) {
            router.push('/spotify-auth');
        }
    }, [tokens, isLoading]);

    useEffect(() => {
        if (userLocation && geoPlaylists.length > 0) {
            checkActiveGeoPlaylists();
        }
    }, [userLocation, geoPlaylists]);

    // Screen Focus Event
    useEffect(() => {
        const handleFocus = () => {
            if (tokens) {
                fetchPlaylists();
            }
        };

        const unsubscribe = router.addListener?.('focus', handleFocus);

        // Fallback: Periodische Aktualisierung alle 30 Sekunden
        if (!unsubscribe) {
            const interval = setInterval(() => {
                if (tokens) {
                    fetchPlaylists();
                }
            }, 30000);

            return () => clearInterval(interval);
        }

        return unsubscribe;
    }, [tokens]);

    // UTILITY FUNCTIONS
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

    const loadGeoPlaylists = () => {
        if (!auth.currentUser) return;

        const db = getFirestore();
        const geoPlaylistsRef = collection(db, 'geoPlaylists');
        const q = query(geoPlaylistsRef, where('userId', '==', auth.currentUser.uid));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const playlists: GeoPlaylist[] = [];
            snapshot.forEach((doc) => {
                playlists.push({
                    id: doc.id,
                    ...doc.data()
                } as GeoPlaylist);
            });
            setGeoPlaylists(playlists);
        });

        return unsubscribe;
    };

    const startLocationTracking = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            const location = await Location.getCurrentPositionAsync({});
            setUserLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            });

            const watchId = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: 5000,
                    distanceInterval: 10,
                },
                (loc) => {
                    setUserLocation({
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude
                    });
                }
            );

            return () => {
                if (watchId) {
                    watchId.remove();
                }
            };
        } catch (error) {
            console.error('Location tracking error:', error);
        }
    };

    const checkActiveGeoPlaylists = () => {
        if (!userLocation) return;

        const active = geoPlaylists.filter(geoPlaylist => {
            if (!geoPlaylist.isActive || !geoPlaylist.location) return false;

            const distance = getDistance(userLocation, geoPlaylist.location);
            return distance <= geoPlaylist.radius;
        });

        setActiveGeoPlaylists(active);
    };

    const getDistance = (point1: {latitude: number, longitude: number}, point2: {latitude: number, longitude: number}) => {
        const R = 6371000;
        const lat1 = point1.latitude * Math.PI / 180;
        const lat2 = point2.latitude * Math.PI / 180;
        const deltaLat = (point2.latitude - point1.latitude) * Math.PI / 180;
        const deltaLon = (point2.longitude - point1.longitude) * Math.PI / 180;

        const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    };

    // SPOTIFY API FUNCTIONS
    const initializeApp = async () => {
        try {
            await fetchProfile();
            await fetchPlaylists();
            fetchCurrentPlayback();

            const interval = setInterval(fetchCurrentPlayback, 5000);
            return () => clearInterval(interval);
        } catch (error) {
            console.error('Fehler bei der App-Initialisierung:', error);
        }
    };

    const spotifyAPI = async (endpoint: string, options: any = {}) => {
        return await spotifyAPICall(endpoint, options);
    };

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

    // PLAYLIST ACTIONS
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

            await fetchPlaylists();
            setNewPlaylistName('');
        } catch (error) {
            Alert.alert('Fehler', 'Playlist konnte nicht erstellt werden.');
        }
    };

    const addTrackToPlaylist = async (trackUri: string, trackName?: string) => {
        if (activeGeoPlaylists.length > 0) {
            const track = searchResults.find(t => t.uri === trackUri) || { uri: trackUri, name: trackName };
            setQuickAddTrack(track);
            setShowQuickAddModal(true);
            return;
        }

        if (!selectedPlaylist) {
            Alert.alert(
                'Playlist wählen',
                'Du befindest dich nicht im Radius einer Geo-Playlist. Wähle eine Playlist aus der Liste aus.',
                [{ text: 'OK' }]
            );
            return;
        }

        try {
            await spotifyAPI(`/playlists/${selectedPlaylist.id}/tracks`, {
                method: 'POST',
                body: JSON.stringify({ uris: [trackUri] }),
            });
            Alert.alert('Erfolg', `Song wurde zu "${selectedPlaylist.name}" hinzugefügt!`);

            await fetchPlaylists();
            if (selectedPlaylist) {
                await fetchPlaylistTracks(selectedPlaylist.id);
            }

            setSearchQuery('');
            setSearchResults([]);
        } catch (error) {
            Alert.alert('Fehler', 'Song konnte nicht hinzugefügt werden.');
        }
    };

    const addCurrentTrackToPlaylist = async () => {
        if (!currentTrack) {
            Alert.alert('Kein Track', 'Es wird gerade kein Song abgespielt.');
            return;
        }

        if (activeGeoPlaylists.length > 0) {
            if (activeGeoPlaylists.length === 1) {
                await addCurrentTrackToGeoPlaylist(activeGeoPlaylists[0]);
            } else {
                setQuickAddTrack(currentTrack);
                setShowQuickAddModal(true);
            }
            return;
        }

        if (!selectedPlaylist) {
            Alert.alert(
                'Playlist wählen',
                'Du befindest dich nicht im Radius einer Geo-Playlist. Wähle eine Playlist aus der Liste aus um den aktuellen Song hinzuzufügen.',
                [{ text: 'OK' }]
            );
            return;
        }

        try {
            await spotifyAPI(`/playlists/${selectedPlaylist.id}/tracks`, {
                method: 'POST',
                body: JSON.stringify({ uris: [currentTrack.uri] }),
            });
            Alert.alert('Erfolg', `"${currentTrack.name}" wurde zu "${selectedPlaylist.name}" hinzugefügt!`);

            await fetchPlaylists();
            if (selectedPlaylist) {
                await fetchPlaylistTracks(selectedPlaylist.id);
            }
        } catch (error) {
            Alert.alert('Fehler', 'Song konnte nicht hinzugefügt werden.');
        }
    };

    const addTrackToGeoPlaylist = async (geoPlaylist: GeoPlaylist, trackUri: string, trackName: string) => {
        try {
            await spotifyAPI(`/playlists/${geoPlaylist.spotifyPlaylistId}/tracks`, {
                method: 'POST',
                body: JSON.stringify({ uris: [trackUri] }),
            });

            Alert.alert(
                'Song hinzugefügt!',
                `"${trackName}" wurde zu "${geoPlaylist.name}" hinzugefügt.`
            );

            await fetchPlaylists();
            if (selectedPlaylist?.id === geoPlaylist.spotifyPlaylistId) {
                await fetchPlaylistTracks(selectedPlaylist.id);
            }

            setShowQuickAddModal(false);
            setQuickAddTrack(null);
            setSearchQuery('');
            setSearchResults([]);
        } catch (error) {
            Alert.alert('Fehler', 'Song konnte nicht hinzugefügt werden.');
        }
    };

    const addCurrentTrackToGeoPlaylist = async (geoPlaylist: GeoPlaylist) => {
        if (!currentTrack) {
            Alert.alert('Kein Track', 'Es wird gerade kein Song abgespielt.');
            return;
        }

        try {
            await spotifyAPI(`/playlists/${geoPlaylist.spotifyPlaylistId}/tracks`, {
                method: 'POST',
                body: JSON.stringify({ uris: [currentTrack.uri] }),
            });

            Alert.alert(
                'Song hinzugefügt!',
                `"${currentTrack.name}" wurde zu "${geoPlaylist.name}" hinzugefügt.`
            );

            await fetchPlaylists();
            if (selectedPlaylist?.id === geoPlaylist.spotifyPlaylistId) {
                await fetchPlaylistTracks(selectedPlaylist.id);
            }
        } catch (error) {
            Alert.alert('Fehler', 'Song konnte nicht hinzugefügt werden.');
        }
    };

    // PLAYBACK CONTROLS
    const togglePlayPause = async () => {
        const currentPlayingState = isPlaying;
        const newPlayingState = !isPlaying;

        try {
            const endpoint = currentPlayingState ? '/me/player/pause' : '/me/player/play';
            setIsPlaying(newPlayingState);

            await spotifyAPI(endpoint, { method: 'PUT' });

            setTimeout(() => {
                if (isPlaying === newPlayingState) {
                    fetchCurrentPlayback();
                }
            }, 1000);
        } catch (error) {
            setTimeout(() => {
                if (isPlaying === newPlayingState) {
                    setIsPlaying(currentPlayingState);
                }
            }, 100);

            try {
                const devices = await spotifyAPI('/me/player/devices');
                if (devices.devices.length === 0) {
                    Alert.alert('Kein Gerät verfügbar', 'Bitte öffne Spotify auf einem Gerät.', [
                        { text: 'Spotify öffnen', onPress: () => Linking.openURL('spotify://') },
                        { text: 'OK' },
                    ]);
                } else {
                    console.log('Playback möglicherweise erfolgreich trotz API-Fehler');
                }
            } catch (deviceError) {
                Alert.alert('Playback-Fehler', 'Stelle sicher, dass Spotify auf einem Gerät läuft.');
            }
        }
    };

    const searchTracks = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const data = await spotifyAPI(`/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=10`);
            setSearchResults(data.tracks.items);
        } catch (error) {
            Alert.alert('Suchfehler', 'Fehler beim Suchen von Tracks.');
        } finally {
            setIsSearching(false);
        }
    };

    const playPlaylist = async (playlistId: string) => {
        try {
            await spotifyAPI('/me/player/play', {
                method: 'PUT',
                body: JSON.stringify({ context_uri: `spotify:playlist:${playlistId}` }),
            });

            setIsPlaying(true);

            setTimeout(() => {
                if (isPlaying === true) {
                    fetchCurrentPlayback();
                }
            }, 1500);
        } catch (error) {
            try {
                const devices = await spotifyAPI('/me/player/devices');
                if (devices.devices.length === 0) {
                    Alert.alert('Kein Gerät verfügbar', 'Bitte öffne Spotify auf einem Gerät.', [
                        { text: 'Spotify öffnen', onPress: () => Linking.openURL('spotify://') },
                        { text: 'OK' },
                    ]);
                } else {
                    console.log('Playlist-Playback möglicherweise erfolgreich trotz API-Fehler');
                    setIsPlaying(true);
                    setTimeout(() => {
                        if (isPlaying === true) {
                            fetchCurrentPlayback();
                        }
                    }, 1500);
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

            setIsPlaying(true);

            setTimeout(() => {
                fetchCurrentPlayback();
            }, 1500);
        } catch (error) {
            try {
                const devices = await spotifyAPI('/me/player/devices');
                if (devices.devices.length === 0) {
                    Alert.alert('Kein Gerät verfügbar', 'Bitte öffne Spotify auf einem Gerät.');
                } else {
                    console.log('Track-Playback möglicherweise erfolgreich trotz API-Fehler');
                    setIsPlaying(true);
                    setTimeout(() => {
                        fetchCurrentPlayback();
                    }, 1500);
                }
            } catch (deviceError) {
                Alert.alert('Playback-Fehler', 'Stelle sicher, dass Spotify auf einem Gerät geöffnet ist.');
            }
        }
    };

    // LOADING STATES
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
                <TouchableOpacity onPress={() => router.push('/spotify-auth')} style={styles.reconnectBtn}>
                    <Text style={styles.btnText}>Neu verbinden</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.pageTitle}>Playlists</Text>
                {activeGeoPlaylists.length > 0 && (
                    <View style={styles.geoIndicator}>
                        <Ionicons name="location" size={16} color="#10B981" />
                        <Text style={styles.geoIndicatorText}>
                            {activeGeoPlaylists.length} Geo-Playlist{activeGeoPlaylists.length > 1 ? 's' : ''}
                        </Text>
                    </View>
                )}
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Aktive Geo-Playlists */}
                {activeGeoPlaylists.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>🎵 Aktive Geo-Playlisten</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {activeGeoPlaylists.map((geoPlaylist) => (
                                <View key={geoPlaylist.id} style={styles.geoPlaylistCard}>
                                    <Image
                                        source={{
                                            uri: geoPlaylist.spotifyPlaylistImage || 'https://via.placeholder.com/100x100/E5E7EB/9CA3AF?text=♪'
                                        }}
                                        style={styles.geoPlaylistImage}
                                    />
                                    <Text style={styles.geoPlaylistName} numberOfLines={2}>
                                        {geoPlaylist.name}
                                    </Text>
                                    <View style={styles.geoPlaylistActions}>
                                        <TouchableOpacity
                                            style={styles.geoActionButton}
                                            onPress={() => playPlaylist(geoPlaylist.spotifyPlaylistId)}
                                        >
                                            <Ionicons name="play" size={12} color="white" />
                                        </TouchableOpacity>
                                        {currentTrack && (
                                            <TouchableOpacity
                                                style={[styles.geoActionButton, styles.addCurrentButton]}
                                                onPress={() => addCurrentTrackToGeoPlaylist(geoPlaylist)}
                                            >
                                                <Ionicons name="add" size={12} color="white" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Musik suchen */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Musik suchen</Text>
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
                            {isSearching ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Ionicons name="search" size={18} color="white" />
                            )}
                        </TouchableOpacity>
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Suchergebnisse */}
                    {searchResults.length > 0 && (
                        <View style={styles.searchResults}>
                            {searchResults.map((item: any) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.trackRow}
                                    onPress={() => addTrackToPlaylist(item.uri, item.name)}
                                >
                                    <Image
                                        source={{
                                            uri: item.album.images?.[0]?.url || 'https://via.placeholder.com/40x40/E5E7EB/9CA3AF?text=♪'
                                        }}
                                        style={styles.trackArtwork}
                                    />
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

                {/* Playlist erstellen */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Playlist erstellen</Text>
                    <View style={styles.inputGroup}>
                        <TextInput
                            value={newPlaylistName}
                            onChangeText={setNewPlaylistName}
                            placeholder="Playlist-Name..."
                            style={styles.textInput}
                            placeholderTextColor="#9CA3AF"
                        />
                        <TouchableOpacity
                            onPress={createPlaylist}
                            style={[styles.primaryButton, !newPlaylistName.trim() && styles.buttonDisabled]}
                            disabled={!newPlaylistName.trim()}
                        >
                            <Ionicons name="add" size={16} color="white" />
                            <Text style={styles.buttonText}>Erstellen</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Deine Playlists */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Deine Playlists</Text>
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
                                    source={{
                                        uri: playlist.images?.[0]?.url || 'https://via.placeholder.com/120x120/E5E7EB/9CA3AF?text=♪'
                                    }}
                                    style={styles.playlistArtwork}
                                />
                                <View style={styles.playlistInfo}>
                                    <Text style={styles.playlistTitle} numberOfLines={2}>
                                        {playlist.name}
                                    </Text>
                                    <Text style={styles.playlistMeta}>
                                        {playlist.tracks.total} Songs
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Ausgewählte Playlist Details */}
                {selectedPlaylist && (
                    <View style={styles.section}>
                        <View style={styles.playlistHeader}>
                            <Image
                                source={{
                                    uri: selectedPlaylist.images?.[0]?.url || 'https://via.placeholder.com/80x80/E5E7EB/9CA3AF?text=♪'
                                }}
                                style={styles.selectedArtwork}
                            />
                            <View style={styles.selectedInfo}>
                                <Text style={styles.selectedTitle}>{selectedPlaylist.name}</Text>
                                <Text style={styles.selectedMeta}>
                                    {selectedPlaylist.tracks.total} Songs • {selectedPlaylist.owner.display_name}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => playPlaylist(selectedPlaylist.id)}
                                    style={styles.playButton}
                                >
                                    <Ionicons name="play" size={14} color="white" />
                                    <Text style={styles.playButtonText}>Abspielen</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Song-Liste */}
                        <View style={styles.trackList}>
                            {playlistTracks.map(({ track }: any, index: number) => (
                                <TouchableOpacity
                                    key={`${track.id}-${index}`}
                                    style={styles.trackRow}
                                    onPress={() => playTrackFromPlaylist(track.uri)}
                                >
                                    <Text style={styles.trackNumber}>{index + 1}</Text>
                                    <Image
                                        source={{
                                            uri: track.album.images?.[0]?.url || 'https://via.placeholder.com/40x40/E5E7EB/9CA3AF?text=♪'
                                        }}
                                        style={styles.trackArtwork}
                                    />
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
                        </View>
                    </View>
                )}

                <View style={styles.bottomSpacing} />
            </ScrollView>

            {/* Quick Add Modal */}
            <Modal visible={showQuickAddModal} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Song hinzufügen</Text>
                        <TouchableOpacity onPress={() => setShowQuickAddModal(false)}>
                            <Ionicons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalContent}>
                        {quickAddTrack && (
                            <View style={styles.trackPreview}>
                                <Image
                                    source={{
                                        uri: quickAddTrack.album?.images?.[0]?.url || 'https://via.placeholder.com/60x60/E5E7EB/9CA3AF?text=♪'
                                    }}
                                    style={styles.trackPreviewImage}
                                />
                                <View style={styles.trackPreviewInfo}>
                                    <Text style={styles.trackPreviewTitle}>{quickAddTrack.name}</Text>
                                    <Text style={styles.trackPreviewArtist}>
                                        {quickAddTrack.artists?.map((a: any) => a.name).join(', ')}
                                    </Text>
                                </View>
                            </View>
                        )}

                        <Text style={styles.modalSectionTitle}>Zu Geo-Playlist hinzufügen:</Text>

                        <ScrollView style={styles.geoPlaylistsList}>
                            {activeGeoPlaylists.map((geoPlaylist) => (
                                <TouchableOpacity
                                    key={geoPlaylist.id}
                                    style={styles.geoPlaylistOption}
                                    onPress={() => addTrackToGeoPlaylist(geoPlaylist, quickAddTrack.uri, quickAddTrack.name)}
                                >
                                    <Image
                                        source={{
                                            uri: geoPlaylist.spotifyPlaylistImage || 'https://via.placeholder.com/50x50/E5E7EB/9CA3AF?text=♪'
                                        }}
                                        style={styles.geoPlaylistOptionImage}
                                    />
                                    <View style={styles.geoPlaylistOptionInfo}>
                                        <Text style={styles.geoPlaylistOptionName}>{geoPlaylist.name}</Text>
                                        <Text style={styles.geoPlaylistOptionLocation}>
                                            📍 Aktiv ({geoPlaylist.radius}m Radius)
                                        </Text>
                                    </View>
                                    <Ionicons name="add-circle" size={24} color="#10B981" />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {selectedPlaylist && (
                            <>
                                <Text style={styles.modalSectionTitle}>Oder zu normaler Playlist:</Text>
                                <TouchableOpacity
                                    style={styles.normalPlaylistOption}
                                    onPress={() => {
                                        addTrackToPlaylist(quickAddTrack.uri, quickAddTrack.name);
                                        setShowQuickAddModal(false);
                                    }}
                                >
                                    <Image
                                        source={{
                                            uri: selectedPlaylist.images?.[0]?.url || 'https://via.placeholder.com/50x50/E5E7EB/9CA3AF?text=♪'
                                        }}
                                        style={styles.geoPlaylistOptionImage}
                                    />
                                    <View style={styles.geoPlaylistOptionInfo}>
                                        <Text style={styles.geoPlaylistOptionName}>{selectedPlaylist.name}</Text>
                                        <Text style={styles.geoPlaylistOptionLocation}>
                                            {selectedPlaylist.tracks.total} Songs
                                        </Text>
                                    </View>
                                    <Ionicons name="add-circle" size={24} color="#3B82F6" />
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </SafeAreaView>
            </Modal>

            {/* Now Playing Bar */}
            {currentTrack && (
                <View style={styles.nowPlayingBar}>
                    <Image
                        source={{
                            uri: currentTrack.album.images[0]?.url || 'https://via.placeholder.com/48x48/E5E7EB/9CA3AF?text=♪'
                        }}
                        style={styles.nowPlayingArtwork}
                    />
                    <View style={styles.nowPlayingInfo}>
                        <Text style={styles.nowPlayingTitle} numberOfLines={1}>{currentTrack.name}</Text>
                        <Text style={styles.nowPlayingArtist} numberOfLines={1}>
                            {currentTrack.artists.map((a: any) => a.name).join(', ')}
                        </Text>
                    </View>

                    {(activeGeoPlaylists.length > 0 || selectedPlaylist) && (
                        <TouchableOpacity
                            style={styles.quickAddCurrentButton}
                            onPress={addCurrentTrackToPlaylist}
                        >
                            <Ionicons name="add" size={16} color="white" />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity onPress={togglePlayPause} style={styles.playPauseButton}>
                        <Ionicons
                            name={isPlaying ? "pause" : "play"}
                            size={20}
                            color="white"
                        />
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#4B5563',
    },
    geoIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginTop: 8,
    },
    geoIndicatorText: {
        fontSize: 12,
        color: '#10B981',
        marginLeft: 4,
        fontWeight: '600',
    },
    section: {
        marginBottom: 32,
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#4B5563',
        marginBottom: 16,
    },
    geoPlaylistCard: {
        width: 120,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        marginRight: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 2,
        borderColor: '#10B981',
    },
    geoPlaylistImage: {
        width: '100%',
        height: 80,
        borderRadius: 8,
        marginBottom: 8,
    },
    geoPlaylistName: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 8,
        lineHeight: 16,
        height: 32,
    },
    geoPlaylistActions: {
        flexDirection: 'row',
        gap: 4,
    },
    geoActionButton: {
        backgroundColor: '#10B981',
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addCurrentButton: {
        backgroundColor: '#3B82F6',
    },
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
    searchButton: {
        backgroundColor: '#3B82F6',
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    clearButton: {
        marginLeft: 8,
    },
    searchResults: {
        marginTop: 16,
    },
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
    playlistScrollContainer: {
        paddingLeft: 10,
        paddingRight: 20,
        paddingBottom: 10,
        paddingTop: 5,
    },
    playlistCard: {
        width: 160,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        marginRight: 16,
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
        height: 136,
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
    modalContainer: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        backgroundColor: 'white',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1F2937',
    },
    modalContent: {
        flex: 1,
        padding: 20,
    },
    modalSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 16,
        marginTop: 20,
    },
    trackPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    trackPreviewImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 12,
    },
    trackPreviewInfo: {
        flex: 1,
    },
    trackPreviewTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    trackPreviewArtist: {
        fontSize: 14,
        color: '#6B7280',
    },
    geoPlaylistsList: {
        maxHeight: 300,
    },
    geoPlaylistOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    geoPlaylistOptionImage: {
        width: 50,
        height: 50,
        borderRadius: 8,
        marginRight: 12,
    },
    geoPlaylistOptionInfo: {
        flex: 1,
    },
    geoPlaylistOptionName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    geoPlaylistOptionLocation: {
        fontSize: 12,
        color: '#10B981',
    },
    normalPlaylistOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    bottomSpacing: {
        height: 120,
        marginBottom: 20,
    },
    nowPlayingBar: {
        position: 'absolute',
        left: 20,
        right: 20,
        bottom: 80,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
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
    quickAddCurrentButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#10B981',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    playPauseButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
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