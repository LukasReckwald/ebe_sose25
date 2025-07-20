import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '@/firebaseConfig';
import { router } from 'expo-router';
import { getValidSpotifyTokens, SpotifyTokens } from '@/utils/spotifyToken';

import PlaylistHeader from '@/components/PlaylistHeader';
import TabNavigation from '@/components/TabNavigation';
import OverviewTab from '@/components/playlist/OverviewTab';
import SearchTab from '@/components/playlist/SearchTab';
import CreateTab from '@/components/playlist/CreateTab';
import PlaylistDetailModal from '@/components/playlist/PlaylistDetailModal';
import QuickAddModal from '@/components/QuickAddModal';
import NowPlayingBar from '@/components/NowPlayingBar';
import { useSpotifyAPI } from '@/hooks/useSpotifyAPI';
import { useGeoPlaylists } from '@/hooks/useGeoPlaylists';
import { useLocationTracking } from '@/hooks/useLocationTracking';

export default function PlaylistScreen() {
    // Token Management
    const [tokens, setTokens] = useState<SpotifyTokens | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // UI State
    const [currentView, setCurrentView] = useState<'overview' | 'search' | 'create'>('overview');
    const [showPlaylistDetailModal, setShowPlaylistDetailModal] = useState(false);
    const [showQuickAddModal, setShowQuickAddModal] = useState(false);
    const [detailPlaylist, setDetailPlaylist] = useState<any>(null);
    const [quickAddTrack, setQuickAddTrack] = useState<any>(null);
    const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);

    // Custom Hooks
    const { geoPlaylists, activeGeoPlaylists, checkActiveGeoPlaylists } = useGeoPlaylists();
    const { userLocation } = useLocationTracking();
    const {
        userProfile,
        playlists,
        playlistTracks,
        currentTrack,
        isPlaying,
        initializeApp,
        fetchPlaylists,
        fetchPlaylistTracks,
        createPlaylist,
        addTrackToPlaylist,
        addTrackToGeoPlaylist,
        addCurrentTrackToPlaylist,
        addCurrentTrackToGeoPlaylist,
        playPlaylist,
        playTrackFromPlaylist,
        togglePlayPause,
        searchTracks
    } = useSpotifyAPI(tokens);

    // Update active geo playlists when location or geoPlaylists change
    useEffect(() => {
        if (userLocation && geoPlaylists.length > 0) {
            checkActiveGeoPlaylists(userLocation);
        }
    }, [userLocation, geoPlaylists, checkActiveGeoPlaylists]);

    useEffect(() => {
        if (!auth.currentUser) {
            router.push('/login');
            return;
        }
        loadAndValidateTokens();
    }, []);

    useEffect(() => {
        if (tokens) {
            initializeApp();
        } else if (!isLoading) {
            router.push('/spotify-auth');
        }
    }, [tokens, isLoading]);

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

    const openPlaylistDetail = (playlist: any) => {
        setDetailPlaylist(playlist);
        fetchPlaylistTracks(playlist.id);
        setShowPlaylistDetailModal(true);
    };

    const openQuickAddModal = (track: any) => {
        setQuickAddTrack(track);
        setShowQuickAddModal(true);
    };

    // VERBESSERTE FUNKTION FÜR PLAYLIST HINZUFÜGUNG
    const handleAddToPlaylist = async (playlistId: string, trackUri: string, trackName: string, playlist: any) => {
        try {
            // Playlist sofort setzen für korrekte Referenz
            setSelectedPlaylist(playlist);

            // Track hinzufügen mit direkten Parametern
            await addTrackToPlaylist(trackUri, trackName, playlistId, playlist);

            // Modal schließen
            setShowQuickAddModal(false);
            setQuickAddTrack(null);
        } catch (error) {
            console.error('Error adding track to playlist:', error);
        }
    };

    // Loading States
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
            <PlaylistHeader activeGeoPlaylists={activeGeoPlaylists} />
            <TabNavigation currentView={currentView} setCurrentView={setCurrentView} />

            {currentView === 'overview' && (
                <OverviewTab
                    geoPlaylists={geoPlaylists}
                    activeGeoPlaylists={activeGeoPlaylists}
                    playlists={playlists}
                    currentTrack={currentTrack}
                    onPlaylistPress={openPlaylistDetail}
                    onPlayPlaylist={playPlaylist}
                    onAddCurrentToGeoPlaylist={addCurrentTrackToGeoPlaylist}
                />
            )}

            {currentView === 'search' && (
                <SearchTab
                    onTrackPress={openQuickAddModal}
                    onSearch={searchTracks}
                />
            )}

            {currentView === 'create' && (
                <CreateTab onCreatePlaylist={createPlaylist} />
            )}

            <PlaylistDetailModal
                visible={showPlaylistDetailModal}
                playlist={detailPlaylist}
                tracks={playlistTracks}
                currentTrack={currentTrack}
                onClose={() => setShowPlaylistDetailModal(false)}
                onPlayPlaylist={playPlaylist}
                onPlayTrack={playTrackFromPlaylist}
                onAddCurrentTrack={(playlist) => {
                    setSelectedPlaylist(playlist);
                    addCurrentTrackToPlaylist();
                }}
            />

            <QuickAddModal
                visible={showQuickAddModal}
                track={quickAddTrack}
                activeGeoPlaylists={activeGeoPlaylists}
                playlists={playlists}
                onClose={() => setShowQuickAddModal(false)}
                onAddToGeoPlaylist={addTrackToGeoPlaylist}
                onAddToPlaylist={handleAddToPlaylist}
            />

            <NowPlayingBar
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                hasActiveOptions={activeGeoPlaylists.length > 0 || selectedPlaylist}
                onTogglePlayPause={togglePlayPause}
                onAddCurrentTrack={addCurrentTrackToPlaylist}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 20,
    },
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
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