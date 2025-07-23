import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { spotifyAPICall } from '@/utils/spotifyToken';
import { router } from 'expo-router';

export function useSpotifyAPI(tokens: any) {
    const [userProfile, setUserProfile] = useState<any>(null);
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [playlistTracks, setPlaylistTracks] = useState<any[]>([]);
    const [currentTrack, setCurrentTrack] = useState<any>(null);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);

    const spotifyAPI = async (endpoint: string, options: any = {}) => {
        return await spotifyAPICall(endpoint, options);
    };

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

    const fetchProfile = async () => {
        const profile = await spotifyAPI('/me');
        setUserProfile(profile);
    };

    const fetchPlaylists = async () => {
        try {
            let allPlaylists: any[] = [];
            let offset = 0;
            const limit = 50;
            let hasMore = true;
            let pageCount = 0;

            while (hasMore && pageCount < 20) {
                pageCount++;
                const endpoint = `/me/playlists?limit=${limit}&offset=${offset}`;
                const data = await spotifyAPI(endpoint);

                if (data && data.items) {
                    allPlaylists = [...allPlaylists, ...data.items];

                    if (data.items.length < limit || allPlaylists.length >= data.total) {
                        hasMore = false;
                    } else {
                        offset += limit;
                    }
                } else {
                    hasMore = false;
                }
            }

            setPlaylists(allPlaylists);
        } catch (error) {
            console.error('Error fetching playlists:', error);

            try {
                const data = await spotifyAPI('/me/playlists?limit=50');
                if (data && data.items) {
                    setPlaylists(data.items);
                }
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
                Alert.alert('Fehler', 'Playlists konnten nicht geladen werden.');
            }
        }
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

    const createPlaylist = async (name: string) => {
        if (!name.trim()) {
            return Alert.alert('Fehler', 'Bitte gib einen Namen für die Playlist ein.');
        }
        if (!userProfile) {
            return Alert.alert('Fehler', 'Profil wird noch geladen...');
        }

        try {
            const data = await spotifyAPI(`/users/${userProfile.id}/playlists`, {
                method: 'POST',
                body: JSON.stringify({ name: name.trim(), public: true }),
            });
            Alert.alert('Erfolg', `Playlist "${data.name}" wurde erstellt!`);
            await fetchPlaylists();
        } catch (error) {
            Alert.alert('Fehler', 'Playlist konnte nicht erstellt werden.');
        }
    };

    const addTrackToPlaylist = async (trackUri: string, trackName?: string, playlistId?: string, playlist?: any) => {
        const targetPlaylistId = playlistId || selectedPlaylist?.id;
        const targetPlaylist = playlist || selectedPlaylist;

        if (!targetPlaylistId) {
            Alert.alert('Fehler', 'Keine Playlist ausgewählt.');
            return;
        }

        try {
            await spotifyAPI(`/playlists/${targetPlaylistId}/tracks`, {
                method: 'POST',
                body: JSON.stringify({ uris: [trackUri] }),
            });

            const playlistName = targetPlaylist?.name || 'der Playlist';
            const songName = trackName || 'Song';
            Alert.alert('Erfolg', `"${songName}" wurde zu "${playlistName}" hinzugefügt!`);

            await fetchPlaylists();

        } catch (error) {
            Alert.alert('Fehler', 'Song konnte nicht hinzugefügt werden.');
            throw error; // Fehler weiterleiten
        }
    };

    const addTrackToGeoPlaylist = async (geoPlaylist: any, trackUri: string, trackName: string) => {
        try {
            await spotifyAPI(`/playlists/${geoPlaylist.spotifyPlaylistId}/tracks`, {
                method: 'POST',
                body: JSON.stringify({ uris: [trackUri] }),
            });
            Alert.alert('Song hinzugefügt!', `"${trackName}" wurde zu "${geoPlaylist.name}" hinzugefügt.`);
            await fetchPlaylists();
        } catch (error) {
            Alert.alert('Fehler', 'Song konnte nicht hinzugefügt werden.');
        }
    };

    const addCurrentTrackToPlaylist = async (playlistId?: string, playlist?: any) => {
        if (!currentTrack) {
            Alert.alert('Kein Track', 'Es wird gerade kein Song abgespielt.');
            return;
        }

        if (!playlistId) {
            return;
        }

        try {
            await spotifyAPI(`/playlists/${playlistId}/tracks`, {
                method: 'POST',
                body: JSON.stringify({ uris: [currentTrack.uri] }),
            });

            const playlistName = playlist?.name || 'der Playlist';
            Alert.alert('Song hinzugefügt!', `"${currentTrack.name}" wurde zu "${playlistName}" hinzugefügt.`);
            await fetchPlaylists();
        } catch (error) {
            Alert.alert('Fehler', 'Song konnte nicht hinzugefügt werden.');
            throw error;
        }
    };

    const addCurrentTrackToGeoPlaylist = async (geoPlaylist: any) => {
        if (!currentTrack) {
            Alert.alert('Kein Track', 'Es wird gerade kein Song abgespielt.');
            return;
        }

        try {
            await spotifyAPI(`/playlists/${geoPlaylist.spotifyPlaylistId}/tracks`, {
                method: 'POST',
                body: JSON.stringify({ uris: [currentTrack.uri] }),
            });
            Alert.alert('Song hinzugefügt!', `"${currentTrack.name}" wurde zu "${geoPlaylist.name}" hinzugefügt.`);
            await fetchPlaylists();
        } catch (error) {
            Alert.alert('Fehler', 'Song konnte nicht hinzugefügt werden.');
        }
    };

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
                }
            } catch (deviceError) {
                Alert.alert('Playback-Fehler', 'Stelle sicher, dass Spotify auf einem Gerät läuft.');
            }
        }
    };

    const searchTracks = async (query: string) => {
        try {
            const data = await spotifyAPI(`/search?q=${encodeURIComponent(query)}&type=track&limit=10`);
            return data.tracks.items;
        } catch (error) {
            Alert.alert('Suchfehler', 'Fehler beim Suchen von Tracks.');
            return [];
        }
    };

    const playPlaylist = async (playlistId: string) => {
        try {
            await spotifyAPI('/me/player/play', {
                method: 'PUT',
                body: JSON.stringify({ context_uri: `spotify:playlist:${playlistId}` }),
            });
            setIsPlaying(true);
            setTimeout(() => fetchCurrentPlayback(), 1500);
        } catch (error) {
            handlePlaybackError();
        }
    };

    const playTrackFromPlaylist = async (trackUri: string) => {
        try {
            await spotifyAPI('/me/player/play', {
                method: 'PUT',
                body: JSON.stringify({ uris: [trackUri] }),
            });
            setIsPlaying(true);
            setTimeout(() => fetchCurrentPlayback(), 1500);
        } catch (error) {
            handlePlaybackError();
        }
    };

    const handlePlaybackError = async () => {
        try {
            const devices = await spotifyAPI('/me/player/devices');
            if (devices.devices.length === 0) {
                Alert.alert('Kein Gerät verfügbar', 'Bitte öffne Spotify auf einem Gerät.', [
                    { text: 'Spotify öffnen', onPress: () => Linking.openURL('spotify://') },
                    { text: 'OK' },
                ]);
            }
        } catch (deviceError) {
            Alert.alert('Playback-Fehler', 'Stelle sicher, dass Spotify auf einem Gerät geöffnet ist.');
        }
    };

    useEffect(() => {
        const handleFocus = () => {
            if (tokens) {
                fetchPlaylists();
            }
        };

        const unsubscribe = router.addListener?.('focus', handleFocus);

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

    return {
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
    };
}