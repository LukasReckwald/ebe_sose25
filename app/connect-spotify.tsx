import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, Image, TouchableOpacity, ScrollView,
    Alert, StyleSheet, SafeAreaView, ActivityIndicator
} from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '@/firebaseConfig';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { router } from 'expo-router';

// Spotify Auth Config
const SPOTIFY_CLIENT_ID = 'your-real-client-id'; // Ersetze mit deiner echten Client ID
const SPOTIFY_CLIENT_SECRET = 'your-real-client-secret'; // Ersetze mit deinem echten Client Secret
const REDIRECT_URI = AuthSession.makeRedirectUri({ useProxy: true });
const SCOPES = [
    'user-read-email', 'user-read-private', 'playlist-read-private',
    'playlist-modify-public', 'playlist-modify-private',
    'user-modify-playback-state', 'user-read-playback-state',
    'streaming', 'user-library-read', 'user-library-modify',
];

const discovery = {
    authorizationEndpoint: 'https://accounts.spotify.com/authorize',
    tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

// Base64 Encoding Funktion
const encode = (str: string): string => {
    return btoa(str);
};

export default function SpotifyApp() {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [refreshToken, setRefreshToken] = useState<string | null>(null);
    const [tokenExpiration, setTokenExpiration] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnecting, setIsConnecting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

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

    const [request, response, promptAsync] = AuthSession.useAuthRequest(
        {
            clientId: SPOTIFY_CLIENT_ID,
            redirectUri: REDIRECT_URI,
            scopes: SCOPES,
            responseType: 'code',
            usePKCE: false, // Wir verwenden Client Secret
        },
        discovery
    );

    useEffect(() => {
        // Überprüfe Firebase Auth Status
        if (!auth.currentUser) {
            router.push('/login');
            return;
        }

        // Lade gespeicherte Spotify-Tokens
        loadStoredTokens();
    }, []);

    useEffect(() => {
        if (response?.type === 'success') {
            exchangeCodeForTokens(response.params.code);
        }
    }, [response]);

    useEffect(() => {
        if (accessToken && isTokenValid()) {
            initializeApp();
        }
    }, [accessToken]);

    // Lade gespeicherte Tokens aus Firebase
    const loadStoredTokens = async () => {
        try {
            const uid = auth.currentUser?.uid;
            if (!uid) return;

            const docRef = doc(getFirestore(), 'spotifyTokens', uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setAccessToken(data.accessToken);
                setRefreshToken(data.refreshToken);
                setTokenExpiration(data.expiration);

                // Überprüfe ob Token noch gültig ist
                if (data.expiration > Date.now()) {
                    setAccessToken(data.accessToken);
                } else if (data.refreshToken) {
                    await refreshAccessToken(data.refreshToken);
                }
            }
        } catch (error) {
            console.error('Fehler beim Laden der Tokens:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Tausche Authorization Code gegen Access Token
    const exchangeCodeForTokens = async (code: string) => {
        setIsConnecting(true);
        setErrorMessage('');

        try {
            const authorizationHeader = encode(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);
            const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Basic ${authorizationHeader}`,
                },
                body: `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`
            });

            const tokenData = await tokenRes.json();

            if (!tokenRes.ok) {
                throw new Error(tokenData.error_description || 'Token-Austausch fehlgeschlagen');
            }

            const { access_token, refresh_token, expires_in } = tokenData;
            const expiration = Date.now() + expires_in * 1000;

            // Speichere Tokens in Firebase
            await saveTokensToFirebase(access_token, refresh_token, expiration);

            setAccessToken(access_token);
            setRefreshToken(refresh_token);
            setTokenExpiration(expiration);

        } catch (error) {
            setErrorMessage('Fehler bei der Spotify-Verbindung. Bitte versuche es erneut.');
            console.error('Spotify Auth Error:', error);
        } finally {
            setIsConnecting(false);
        }
    };

    // Aktualisiere Access Token mit Refresh Token
    const refreshAccessToken = async (refreshToken: string) => {
        try {
            const authorizationHeader = encode(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);
            const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Basic ${authorizationHeader}`,
                },
                body: `grant_type=refresh_token&refresh_token=${refreshToken}`
            });

            const tokenData = await tokenRes.json();

            if (tokenRes.ok) {
                const { access_token, expires_in } = tokenData;
                const expiration = Date.now() + expires_in * 1000;

                await saveTokensToFirebase(access_token, refreshToken, expiration);

                setAccessToken(access_token);
                setTokenExpiration(expiration);

                return access_token;
            }
        } catch (error) {
            console.error('Fehler beim Token-Refresh:', error);
        }
        return null;
    };

    // Speichere Tokens in Firebase
    const saveTokensToFirebase = async (accessToken: string, refreshToken: string, expiration: number) => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        await setDoc(doc(getFirestore(), 'spotifyTokens', uid), {
            accessToken,
            refreshToken,
            expiration,
            updatedAt: new Date().toISOString(),
        });
    };

    // Überprüfe ob Token noch gültig ist
    const isTokenValid = (): boolean => {
        return tokenExpiration ? tokenExpiration > Date.now() + 60000 : false; // 1 Minute Puffer
    };

    // Initialisiere App nach erfolgreichem Login
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

    // Spotify API Wrapper mit automatischem Token-Refresh
    const spotifyAPI = async (endpoint: string, options: any = {}) => {
        let token = accessToken;

        // Überprüfe Token-Gültigkeit
        if (!isTokenValid() && refreshToken) {
            token = await refreshAccessToken(refreshToken);
        }

        if (!token) {
            throw new Error('Kein gültiger Access Token verfügbar');
        }

        const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
            ...options,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!res.ok) {
            if (res.status === 401 && refreshToken) {
                // Token ist abgelaufen, versuche Refresh
                token = await refreshAccessToken(refreshToken);
                if (token) {
                    // Wiederhole Request mit neuem Token
                    return fetch(`https://api.spotify.com/v1${endpoint}`, {
                        ...options,
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                            ...options.headers,
                        },
                    }).then(res => res.json());
                }
            }
            throw new Error('Spotify API Error');
        }

        return res.json();
    };

    // Alle bestehenden Spotify-Funktionen bleiben gleich
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
        const endpoint = isPlaying ? '/me/player/pause' : '/me/player/play';
        await spotifyAPI(endpoint, { method: 'PUT' });
        setIsPlaying(!isPlaying);
    };

    const searchTracks = async () => {
        if (!searchQuery.trim()) return;
        const data = await spotifyAPI(`/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=10`);
        setSearchResults(data.tracks.items);
    };

    const addTrackToPlaylist = async (trackUri: string) => {
        if (!selectedPlaylist) return Alert.alert('Playlist auswählen');
        await spotifyAPI(`/playlists/${selectedPlaylist.id}/tracks`, {
            method: 'POST',
            body: JSON.stringify({ uris: [trackUri] }),
        });
        Alert.alert('Song hinzugefügt!');
        fetchPlaylistTracks(selectedPlaylist.id);
        setSearchQuery('');
        setSearchResults([]);
    };

    const createPlaylist = async () => {
        if (!newPlaylistName.trim()) return Alert.alert('Fehler', 'Bitte gib einen Namen für die Playlist ein');
        if (!userProfile) return Alert.alert('Profil wird geladen…');

        const name = newPlaylistName.trim();
        const data = await spotifyAPI(`/users/${userProfile.id}/playlists`, {
            method: 'POST',
            body: JSON.stringify({ name, public: true }),
        });
        Alert.alert('Playlist erstellt:', data.name);
        fetchPlaylists();
        setNewPlaylistName('');
    };

    const playPlaylist = async (playlistId: string) => {
        try {
            await spotifyAPI('/me/player/play', {
                method: 'PUT',
                body: JSON.stringify({ context_uri: `spotify:playlist:${playlistId}` }),
            });
        } catch (error) {
            Alert.alert('Playback-Fehler', 'Bitte stelle sicher, dass Spotify auf einem Gerät geöffnet ist.', [
                { text: 'Spotify öffnen', onPress: () => Linking.openURL('spotify://') },
                { text: 'OK' },
            ]);
        }
    };

    const playTrackFromPlaylist = async (trackUri: string) => {
        try {
            await spotifyAPI('/me/player/play', {
                method: 'PUT',
                body: JSON.stringify({ uris: [trackUri] }),
            });
        } catch (error) {
            Alert.alert('Playback-Fehler', 'Bitte stelle sicher, dass Spotify auf einem Gerät geöffnet ist.');
        }
    };

    // Logout-Funktion
    const handleLogout = async () => {
        try {
            const uid = auth.currentUser?.uid;
            if (uid) {
                // Lösche Tokens aus Firebase
                await setDoc(doc(getFirestore(), 'spotifyTokens', uid), {});
            }

            // Setze lokalen State zurück
            setAccessToken(null);
            setRefreshToken(null);
            setTokenExpiration(null);
            setUserProfile(null);
            setPlaylists([]);
            setSelectedPlaylist(null);
            setPlaylistTracks([]);
            setCurrentTrack(null);
            setIsPlaying(false);

            // Melde von Firebase ab
            await auth.signOut();
            router.push('/login');
        } catch (error) {
            console.error('Logout-Fehler:', error);
        }
    };

    // Loading Screen
    if (isLoading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator size="large" color="#1DB954" />
                <Text style={styles.loadingText}>Lade Spotify-Verbindung...</Text>
            </SafeAreaView>
        );
    }

    // Login Screen
    if (!accessToken || !isTokenValid()) {
        return (
            <SafeAreaView style={styles.center}>
                <Text style={styles.title}>Spotify-Verbindung</Text>
                <Text style={styles.subtitle}>
                    Verbinde dein Spotify-Konto, um die App zu nutzen
                </Text>

                {errorMessage && (
                    <Text style={styles.errorText}>{errorMessage}</Text>
                )}

                <TouchableOpacity
                    onPress={() => promptAsync()}
                    style={styles.loginBtn}
                    disabled={isConnecting}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="logo-spotify" size={20} color="white" />
                        <Text style={[styles.loginText, { marginLeft: 8 }]}>
                            {isConnecting ? 'Verbinde...' : 'Mit Spotify verbinden'}
                        </Text>
                    </View>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    // Main App Interface
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
            <ScrollView style={{ padding: 20 }}>
                {/* User Profile */}
                {userProfile && (
                    <View style={styles.card}>
                        <Image source={{ uri: userProfile.images?.[0]?.url }} style={styles.avatar} />
                        <Text style={styles.name}>{userProfile.display_name}</Text>
                        <Text style={styles.meta}>{userProfile.email}</Text>
                        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                            <Text style={styles.logoutText}>Abmelden</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Search */}
                <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Suchbegriff eingeben"
                    style={styles.input}
                    placeholderTextColor="#999"
                />
                <TouchableOpacity onPress={searchTracks} style={styles.searchBtn}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="search" size={20} color="white" />
                        <Text style={[styles.searchText, { marginLeft: 6 }]}>Suchen</Text>
                    </View>
                </TouchableOpacity>

                {/* Search Results */}
                {searchResults.map((item: any) => (
                    <TouchableOpacity
                        key={item.id}
                        style={styles.trackItem}
                        onPress={() => addTrackToPlaylist(item.uri)}
                    >
                        <Image source={{ uri: item.album.images?.[0]?.url }} style={styles.trackImage} />
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="musical-notes" size={16} color="white" style={{ marginRight: 6 }} />
                            <Text style={styles.trackText}>
                                {item.name} – {item.artists.map((a: any) => a.name).join(', ')}
                            </Text>
                        </View>
                    </TouchableOpacity>
                ))}

                {/* Create Playlist */}
                <TextInput
                    value={newPlaylistName}
                    onChangeText={setNewPlaylistName}
                    placeholder="Name für neue Playlist"
                    style={styles.input}
                    placeholderTextColor="#999"
                />
                <TouchableOpacity onPress={createPlaylist} style={styles.loginBtn}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="add-circle-outline" size={20} color="white" />
                        <Text style={[styles.loginText, { marginLeft: 6 }]}>Neue Playlist erstellen</Text>
                    </View>
                </TouchableOpacity>

                {/* Playlists */}
                <Text style={styles.title}>🎵 Deine Playlists</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {playlists.map((playlist: any) => (
                        <TouchableOpacity
                            key={playlist.id}
                            style={styles.playlistItem}
                            onPress={() => {
                                setSelectedPlaylist(playlist);
                                fetchPlaylistTracks(playlist.id);
                            }}
                        >
                            <Image source={{ uri: playlist.images?.[0]?.url }} style={styles.playlistCover} />
                            <Text style={styles.playlistName}>{playlist.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Selected Playlist */}
                {selectedPlaylist && (
                    <>
                        <Text style={styles.title}>📻 {selectedPlaylist.name}</Text>
                        <Image source={{ uri: selectedPlaylist.images?.[0]?.url }} style={styles.selectedCover} />
                        {playlistTracks.map(({ track }: any, index: number) => (
                            <TouchableOpacity
                                key={`${track.id}-${index}`}
                                style={styles.trackItem}
                                onPress={() => playTrackFromPlaylist(track.uri)}
                            >
                                <Image source={{ uri: track.album.images?.[0]?.url }} style={styles.trackImage} />
                                <Text style={styles.trackText}>
                                    {track.name} – {track.artists.map((a: any) => a.name).join(', ')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity onPress={() => playPlaylist(selectedPlaylist.id)} style={styles.loginBtn}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="play-circle" size={20} color="white" />
                                <Text style={[styles.loginText, { marginLeft: 6 }]}>Playlist abspielen</Text>
                            </View>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>

            {/* Now Playing */}
            {currentTrack && (
                <View style={styles.nowPlayingContainer}>
                    <Image source={{ uri: currentTrack.album.images[0].url }} style={styles.nowPlayingImage} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.trackText}>{currentTrack.name}</Text>
                        <Text style={styles.trackTextSmall}>
                            {currentTrack.artists.map((a: any) => a.name).join(', ')}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={togglePlayPause} style={styles.playPauseButton}>
                        {isPlaying ? (
                            <Ionicons name="pause" size={24} color="white" />
                        ) : (
                            <Ionicons name="play" size={24} color="white" />
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', padding: 20 },
    title: { fontSize: 24, color: '#1DB954', marginVertical: 10, textAlign: 'center' },
    subtitle: { fontSize: 16, color: '#fff', marginVertical: 10, textAlign: 'center' },
    loadingText: { fontSize: 16, color: '#fff', marginTop: 10 },
    errorText: { color: '#ff6b6b', fontSize: 14, marginVertical: 10, textAlign: 'center' },
    loginBtn: { backgroundColor: '#1DB954', padding: 14, borderRadius: 30, marginVertical: 10, alignItems: 'center' },
    loginText: { color: '#fff', fontWeight: 'bold' },
    logoutBtn: { backgroundColor: '#ff6b6b', padding: 8, borderRadius: 20, marginTop: 10 },
    logoutText: { color: '#fff', fontSize: 12 },
    card: { backgroundColor: '#1e1e1e', padding: 20, borderRadius: 10, alignItems: 'center', marginBottom: 20 },
    avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 10 },
    name: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    meta: { color: '#aaa' },
    input: { backgroundColor: '#222', color: '#fff', padding: 10, borderRadius: 20, marginVertical: 10 },
    searchBtn: { backgroundColor: '#1DB954', padding: 10, borderRadius: 20, alignItems: 'center', marginVertical: 10 },
    searchText: { color: '#fff', fontWeight: 'bold' },
    trackItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomColor: '#333', borderBottomWidth: 1 },
    trackText: { color: '#fff', marginLeft: 10, flexShrink: 1 },
    trackImage: { width: 40, height: 40, borderRadius: 4 },
    trackTextSmall: { color: '#aaa', fontSize: 12 },
    playlistItem: { alignItems: 'center', marginRight: 10 },
    playlistCover: { width: 100, height: 100, borderRadius: 10 },
    playlistName: { color: '#fff', marginTop: 5, textAlign: 'center', width: 100 },
    selectedCover: { width: '100%', height: 200, borderRadius: 10, marginVertical: 10 },
    nowPlayingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#1e1e1e',
        borderTopWidth: 1,
        borderColor: '#333',
        borderRadius: 8,
        margin: 10,
    },
    nowPlayingImage: { width: 50, height: 50, borderRadius: 4 },
    playPauseButton: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#1DB954', borderRadius: 20 },
});