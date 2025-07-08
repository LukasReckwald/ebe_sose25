import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    Image,
    TouchableOpacity,
    ScrollView,
    Alert,
    StyleSheet,
    SafeAreaView,
} from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';

const CLIENT_ID = 'b2e0f32a87604e3cb0ab618c66633346';
const REDIRECT_URI = AuthSession.makeRedirectUri({ useProxy: true });
const SCOPES = [
    'user-read-email',
    'user-read-private',
    'playlist-read-private',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-modify-playback-state',
    'user-read-playback-state',
    'streaming',
    'user-library-read',
    'user-library-modify',
];
const discovery = {
    authorizationEndpoint: 'https://accounts.spotify.com/authorize',
    tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export default function SpotifyApp() {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);
    const [playlistTracks, setPlaylistTracks] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [newPlaylistName, setNewPlaylistName] = useState<string>('');

    const [request, response, promptAsync] = AuthSession.useAuthRequest(
        {
            clientId: CLIENT_ID,
            redirectUri: REDIRECT_URI,
            scopes: SCOPES,
            responseType: 'code',
            usePKCE: true,
        },
        discovery
    );

    useEffect(() => {
        const fetchToken = async () => {
            if (response?.type === 'success') {
                const { code } = response.params;
                try {
                    const tokenResponse = await AuthSession.exchangeCodeAsync({
                        clientId: CLIENT_ID,
                        code,
                        redirectUri: REDIRECT_URI,
                        extraParams: { code_verifier: request.codeVerifier },
                    }, discovery);

                    setAccessToken(tokenResponse.accessToken);
                } catch (err) {
                    console.error('Token Exchange Error:', err);
                }
            }
        };
        fetchToken();
    }, [response]);

    useEffect(() => {
        if (accessToken) {
            fetchProfile();
            fetchPlaylists();
        }
    }, [accessToken]);

    const spotifyAPI = async (endpoint: string, options: any = {}) => {
        const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
            ...options,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });
        if (!res.ok) throw new Error('Spotify API Error');
        return res.json();
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

    const searchTracks = async () => {
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
        if (!newPlaylistName.trim()) {
            Alert.alert('Fehler', 'Bitte gib einen Namen für die Playlist ein');
            return;
        }

        if (!userProfile) return Alert.alert('Profil wird geladen…');

        const name = newPlaylistName.trim(); // Use the user-provided name
        const data = await spotifyAPI(`/users/${userProfile.id}/playlists`, {
            method: 'POST',
            body: JSON.stringify({ name, public: true }),
        });
        Alert.alert('Playlist erstellt:', data.name);
        fetchPlaylists();
        setNewPlaylistName(''); // Clear the input field after creating the playlist
    };

    const startPlayback = async (deviceId: string, playlistUri: string) => {
        const body = {
            context_uri: playlistUri,
        };

        const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
            method: 'PUT',
            body: JSON.stringify(body),
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (res.ok) {
            console.log('Wiedergabe gestartet');
        } else {
            console.error('Fehler beim Starten der Wiedergabe');
        }
    };

    const getDevices = async () => {
        const res = await fetch('https://api.spotify.com/v1/me/player/devices', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const data = await res.json();
        return data.devices;
    };

    const playPlaylist = async (playlistId: string) => {
        const devices = await getDevices();

        if (devices.length > 0) {
            const device = devices[0]; // Beispiel: Das erste verfügbare Gerät
            const playlistUri = `spotify:playlist:${playlistId}`;
            await startPlayback(device.id, playlistUri);
        } else {
            // Alert mit einem Button, um Spotify zu öffnen
            Alert.alert(
                'Kein Spotify Connect Gerät verfügbar',
                'Bitte öffnen Sie die Spotify App und verbinden Sie ein Gerät.',
                [
                    {
                        text: 'Spotify öffnen',
                        onPress: () => {
                            Linking.openURL('spotify://'); // Spotify App öffnen
                        },
                    },
                    {
                        text: 'Abbrechen',
                        style: 'cancel',
                    },
                ]
            );
        }
    };

    const startTrackPlayback = async (deviceId: string, trackUri: string) => {
        const body = {
            uris: [trackUri], // Der URI des Tracks wird hier übergeben
        };

        const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
            method: 'PUT',
            body: JSON.stringify(body),
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (res.ok) {
            console.log('Track Wiedergabe gestartet');
        } else {
            console.error('Fehler beim Starten der Wiedergabe des Tracks');
        }
    };

    const playTrackFromPlaylist = async (trackUri: string) => {
        const devices = await getDevices(); // Funktion zum Abrufen der Geräte

        if (devices.length > 0) {
            const device = devices[0]; // Beispiel: das erste verfügbare Gerät
            await startTrackPlayback(device.id, trackUri); // Funktion zum Starten des Tracks auf dem Gerät
        } else {
            Alert.alert(
                'Kein Spotify Connect Gerät verfügbar.',
                'Spotify App muss geöffnet sein, um die Wiedergabe fortzusetzen.',
                [
                    { text: 'OK' },
                    { text: 'Öffne Spotify', onPress: () => Linking.openURL('spotify:') } // Öffne Spotify, falls nötig
                ]
            );
        }
    };


    if (!accessToken) {
        return (
            <SafeAreaView style={styles.center}>
                <Text style={styles.title}>Spotify App</Text>
                <TouchableOpacity onPress={() => promptAsync()} style={styles.loginBtn}>
                    <Text style={styles.loginText}>Login mit Spotify</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
            <ScrollView style={{ padding: 20 }}>
                {userProfile && (
                    <View style={styles.card}>
                        <Image source={{ uri: userProfile.images?.[0]?.url }} style={styles.avatar} />
                        <Text style={styles.name}>{userProfile.display_name}</Text>
                        <Text style={styles.meta}>{userProfile.email}</Text>
                    </View>
                )}

                <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Suchbegriff eingeben"
                    style={styles.input}
                    placeholderTextColor="#999"
                />
                <TouchableOpacity onPress={searchTracks} style={styles.searchBtn}>
                    <Text style={styles.searchText}>🔍 Suchen</Text>
                </TouchableOpacity>

                {searchResults.map((item: any) => (
                    <TouchableOpacity
                        key={item.id}
                        style={styles.trackItem}
                        onPress={() => addTrackToPlaylist(item.uri)}>
                        <Image source={{ uri: item.album.images?.[0]?.url }} style={styles.trackImage} />
                        <Text style={styles.trackText}>🎧 {item.name} – {item.artists.map((a: any) => a.name).join(', ')}</Text>
                    </TouchableOpacity>
                ))}

                <TextInput
                    value={newPlaylistName}
                    onChangeText={setNewPlaylistName}
                    placeholder="Name für neue Playlist"
                    style={styles.input}
                    placeholderTextColor="#999"
                />
                <TouchableOpacity onPress={createPlaylist} style={styles.loginBtn}>
                    <Text style={styles.loginText}>➕ Neue Playlist erstellen</Text>
                </TouchableOpacity>

                <Text style={styles.title}>🎵 Deine Playlists</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {playlists.map((playlist: any) => (
                        <TouchableOpacity
                            key={playlist.id}
                            style={styles.playlistItem}
                            onPress={() => {
                                setSelectedPlaylist(playlist);
                                fetchPlaylistTracks(playlist.id);
                            }}>
                            <Image source={{ uri: playlist.images?.[0]?.url }} style={styles.playlistCover} />
                            <Text style={styles.playlistName}>{playlist.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {selectedPlaylist && (
                    <>
                        <Text style={styles.title}>📻 {selectedPlaylist.name}</Text>
                        <Image source={{ uri: selectedPlaylist.images?.[0]?.url }} style={styles.selectedCover} />
                        {playlistTracks.map(({ track }: any) => (
                            <TouchableOpacity
                                key={track.id}
                                style={styles.trackItem}
                                onPress={() => playTrackFromPlaylist(track.uri)} // Track aus Playlist abspielen
                            >
                                <Image source={{ uri: track.album.images?.[0]?.url }} style={styles.trackImage} />
                                <Text style={styles.trackText}>{track.name} – {track.artists.map((a: any) => a.name).join(', ')}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity onPress={() => playPlaylist(selectedPlaylist.id)} style={styles.loginBtn}>
                            <Text style={styles.loginText}>▶️ Playlist abspielen</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    title: {
        fontSize: 24,
        color: '#1DB954',
        marginVertical: 10,
    },
    loginBtn: {
        backgroundColor: '#1DB954',
        padding: 14,
        borderRadius: 30,
        marginVertical: 10,
    },
    loginText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    card: {
        backgroundColor: '#1e1e1e',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 20,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 10,
    },
    name: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    meta: {
        color: '#aaa',
    },
    input: {
        backgroundColor: '#222',
        color: '#fff',
        padding: 10,
        borderRadius: 20,
        marginVertical: 10,
    },
    searchBtn: {
        backgroundColor: '#1DB954',
        padding: 10,
        borderRadius: 20,
        alignItems: 'center',
        marginVertical: 10,
    },
    searchText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    trackItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderBottomColor: '#333',
        borderBottomWidth: 1,
    },
    trackText: {
        color: '#fff',
        marginLeft: 10,
        flexShrink: 1,
    },
    trackImage: {
        width: 40,
        height: 40,
        borderRadius: 4,
    },
    playlistItem: {
        alignItems: 'center',
        marginRight: 10,
    },
    playlistCover: {
        width: 100,
        height: 100,
        borderRadius: 10,
    },
    playlistName: {
        color: '#fff',
        marginTop: 5,
        textAlign: 'center',
        width: 100,
    },
    selectedCover: {
        width: '100%',
        height: 200,
        borderRadius: 10,
        marginVertical: 10,
    },
});
