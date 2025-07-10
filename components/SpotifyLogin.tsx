import React, {useState, useEffect} from 'react';
import {
    View, Text, TextInput, Image, TouchableOpacity, ScrollView,
    Alert, StyleSheet, SafeAreaView
} from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';

// Auth-Config
const CLIENT_ID = 'b2e0f32a87604e3cb0ab618c66633346';
const REDIRECT_URI = AuthSession.makeRedirectUri({useProxy: true});
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

export default function SpotifyApp() {
    const [accessToken, setAccessToken] = useState<string | null>(null);
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
            clientId: CLIENT_ID,
            redirectUri: REDIRECT_URI,
            scopes: SCOPES,
            responseType: 'code',
            usePKCE: true,
        },
        discovery
    );

/*    const keepPlayerActive = async () => {
        try {
            console.log("ich bin wach")
            // Wenn keine Musik spielt, pausieren wir den Player (um die Verbindung aktiv zu halten)
            if (!isPlaying) {
                await fetch('https://api.spotify.com/v1/me/player/play', {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                });
            }
        } catch (err) {
            console.error('Fehler beim Aktivieren des Players:', err);
        }
    };

    useEffect(() => {
        if (accessToken) {
            const interval = setInterval(() => {
                keepPlayerActive();  // Erhalte den Player aktiv, auch wenn keine Musik läuft
            }, 5000);  // Alle 10 Sekunden

            return () => clearInterval(interval);
        }
    }, [accessToken]);*/

    useEffect(() => {
        const fetchToken = async () => {
            if (response?.type === 'success') {
                const {code} = response.params;
                try {
                    const tokenResponse = await AuthSession.exchangeCodeAsync({
                        clientId: CLIENT_ID,
                        code,
                        redirectUri: REDIRECT_URI,
                        extraParams: {code_verifier: request.codeVerifier},
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
            fetchCurrentPlayback();
            const interval = setInterval(fetchCurrentPlayback, 1000);
            return () => clearInterval(interval);
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

    const fetchCurrentPlayback = async () => {
        const res = await fetch('https://api.spotify.com/v1/me/player', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
            const data = await res.json();
            setCurrentTrack(data.item);
            setIsPlaying(data.is_playing);
        } else {
            setCurrentTrack(null);
        }
    };

    const togglePlayPause = async () => {
        const endpoint = isPlaying ? 'pause' : 'play';
        await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        setIsPlaying(!isPlaying);
    };

    const searchTracks = async () => {
        const data = await spotifyAPI(`/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=10`);
        setSearchResults(data.tracks.items);
    };

    const addTrackToPlaylist = async (trackUri: string) => {
        if (!selectedPlaylist) return Alert.alert('Playlist auswählen');
        await spotifyAPI(`/playlists/${selectedPlaylist.id}/tracks`, {
            method: 'POST',
            body: JSON.stringify({uris: [trackUri]}),
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
            body: JSON.stringify({name, public: true}),
        });
        Alert.alert('Playlist erstellt:', data.name);
        fetchPlaylists();
        setNewPlaylistName('');
    };

    const getDevices = async () => {
        const res = await fetch('https://api.spotify.com/v1/me/player/devices', {
            method: 'GET',
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        return data.devices;
    };

    const startPlayback = async (deviceId: string | null, playlistUri: string) => {
        const body = { context_uri: playlistUri };
        const url = deviceId
            ? `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`
            : `https://api.spotify.com/v1/me/player/play`;

        await fetch(url, {
            method: 'PUT',
            body: JSON.stringify(body),
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });
    };

    const playPlaylist = async (playlistId: string) => {
        const devices = await getDevices();
        const playlistUri = `spotify:playlist:${playlistId}`;
        if (devices.length > 0) {
            await startPlayback(devices[0].id, playlistUri);
        } else {
            await startPlayback('fca2e671c0a971c26f9acd20c191836cd2f32ba4', playlistUri);
            Alert.alert('Kein Gerät sichtbar', 'Bitte öffne Spotify auf deinem Gerät.', [
                {text: 'Spotify öffnen', onPress: () => Linking.openURL('spotify://')},
                {text: 'OK'},
            ]);
        }
    };

    const startTrackPlayback = async (deviceId: string | null, trackUri: string) => {
        const body = { uris: [trackUri] };
        const url = deviceId
            ? `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`
            : `https://api.spotify.com/v1/me/player/play`;

        await fetch(url, {
            method: 'PUT',
            body: JSON.stringify(body),
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });
    };

    const playTrackFromPlaylist = async (trackUri: string) => {
        const devices = await getDevices();
        if (devices.length > 0) {
            await startTrackPlayback(devices[0].id, trackUri);
        } else {
            await startPlayback('fca2e671c0a971c26f9acd20c191836cd2f32ba4', trackUri);
            Alert.alert('Kein Gerät', 'Spotify muss geöffnet sein.', [
                {text: 'OK'},
                {text: 'Öffne Spotify', onPress: () => Linking.openURL('spotify:')},
            ]);
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
        <SafeAreaView style={{flex: 1, backgroundColor: '#000'}}>
            <ScrollView style={{padding: 20}}>
                {userProfile && (
                    <View style={styles.card}>
                        <Image source={{uri: userProfile.images?.[0]?.url}} style={styles.avatar}/>
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
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Ionicons name="search" size={20} color="white"/>
                        <Text style={[styles.searchText, {marginLeft: 6}]}>Suchen</Text>
                    </View>
                </TouchableOpacity>

                {searchResults.map((item: any) => (
                    <TouchableOpacity
                        key={item.id}
                        style={styles.trackItem}
                        onPress={() => addTrackToPlaylist(item.uri)}>
                        <Image source={{uri: item.album.images?.[0]?.url}} style={styles.trackImage}/>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <Ionicons name="musical-notes" size={16} color="white" style={{marginRight: 6}} />
                            <Text style={styles.trackText}>{item.name} – {item.artists.map((a: any) => a.name).join(', ')}</Text>
                        </View>
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
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Ionicons name="add-circle-outline" size={20} color="white"/>
                        <Text style={[styles.loginText, {marginLeft: 6}]}>Neue Playlist erstellen</Text>
                    </View>
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
                            <Image source={{uri: playlist.images?.[0]?.url}} style={styles.playlistCover}/>
                            <Text style={styles.playlistName}>{playlist.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {selectedPlaylist && (
                    <>
                        <Text style={styles.title}>📻 {selectedPlaylist.name}</Text>
                        <Image source={{uri: selectedPlaylist.images?.[0]?.url}} style={styles.selectedCover}/>
                        {playlistTracks.map(({ track }: any, index: number) => (
                            <TouchableOpacity
                                key={`${track.id}-${index}`}
                                style={styles.trackItem}
                                onPress={() => playTrackFromPlaylist(track.uri)}
                            >
                                <Image source={{uri: track.album.images?.[0]?.url}} style={styles.trackImage}/>
                                <Text style={styles.trackText}>
                                    {track.name} – {track.artists.map((a: any) => a.name).join(', ')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity onPress={() => playPlaylist(selectedPlaylist.id)} style={styles.loginBtn}>
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <Ionicons name="play-circle" size={20} color="white"/>
                                <Text style={[styles.loginText, {marginLeft: 6}]}>Playlist abspielen</Text>
                            </View>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>

            {currentTrack && (
                <View style={styles.nowPlayingContainer}>
                    <Image source={{uri: currentTrack.album.images[0].url}} style={styles.nowPlayingImage}/>
                    <View style={{flex: 1, marginLeft: 10}}>
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
    center: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000'},
    title: {fontSize: 24, color: '#1DB954', marginVertical: 10},
    loginBtn: {backgroundColor: '#1DB954', padding: 14, borderRadius: 30, marginVertical: 10, alignItems: 'center'},
    loginText: {color: '#fff', fontWeight: 'bold'},
    card: {backgroundColor: '#1e1e1e', padding: 20, borderRadius: 10, alignItems: 'center', marginBottom: 20},
    avatar: {width: 100, height: 100, borderRadius: 50, marginBottom: 10},
    name: {color: '#fff', fontSize: 20, fontWeight: 'bold'},
    meta: {color: '#aaa'},
    input: {backgroundColor: '#222', color: '#fff', padding: 10, borderRadius: 20, marginVertical: 10},
    searchBtn: {backgroundColor: '#1DB954', padding: 10, borderRadius: 20, alignItems: 'center', marginVertical: 10},
    searchText: {color: '#fff', fontWeight: 'bold'},
    trackItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderBottomColor: '#333',
        borderBottomWidth: 1
    },
    trackText: {color: '#fff', marginLeft: 10, flexShrink: 1},
    trackImage: {width: 40, height: 40, borderRadius: 4},
    trackTextSmall: {color: '#aaa', fontSize: 12},
    playlistItem: {alignItems: 'center', marginRight: 10},
    playlistCover: {width: 100, height: 100, borderRadius: 10},
    playlistName: {color: '#fff', marginTop: 5, textAlign: 'center', width: 100},
    selectedCover: {width: '100%', height: 200, borderRadius: 10, marginVertical: 10},
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
    nowPlayingImage: {width: 50, height: 50, borderRadius: 4},
    playPauseButton: {paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#1DB954', borderRadius: 20},
});
