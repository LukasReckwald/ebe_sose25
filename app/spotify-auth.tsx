import React, { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, Alert, StyleSheet, SafeAreaView, ActivityIndicator
} from 'react-native';
import * as AuthSession from 'expo-auth-session';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '@/firebaseConfig';
import { router } from 'expo-router';
import {
    getValidSpotifyTokens,
    saveSpotifyTokens,
    clearSpotifyTokens,
    SpotifyTokens
} from '@/utils/spotifyTokenUtils';

// Spotify Auth Config
const SPOTIFY_CLIENT_ID = 'b2e0f32a87604e3cb0ab618c66633346';
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

export default function SpotifyAuth() {
    const [tokens, setTokens] = useState<SpotifyTokens | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnecting, setIsConnecting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const [request, response, promptAsync] = AuthSession.useAuthRequest(
        {
            clientId: SPOTIFY_CLIENT_ID,
            redirectUri: REDIRECT_URI,
            scopes: SCOPES,
            responseType: 'code',
            usePKCE: true,
        },
        discovery
    );

    useEffect(() => {
        // Überprüfe Firebase Auth Status
        if (!auth.currentUser) {
            router.push('/login');
            return;
        }

        // Lade gespeicherte Spotify-Tokens und leite bei Erfolg weiter
        loadAndValidateTokens();
    }, []);

    useEffect(() => {
        if (response?.type === 'success') {
            exchangeCodeForTokens(response.params.code);
        }
    }, [response]);

    useEffect(() => {
        // Nach erfolgreichem Token-Load oder OAuth: zur App weiterleiten
        if (tokens) {
            router.replace('/(tabs)/mapview');
        }
    }, [tokens]);

    // Lade und validiere gespeicherte Tokens
    const loadAndValidateTokens = async () => {
        try {
            // Lade Tokens und refreshe automatisch bei Bedarf
            const validTokens = await getValidSpotifyTokens();
            if (validTokens) {
                setTokens(validTokens);
                // Wird automatisch zur App weiterleiten via useEffect
            }
        } catch (error) {
            console.error('Fehler beim Laden der Tokens:', error);
            setTokens(null);
        } finally {
            setIsLoading(false);
        }
    };

    // Tausche Authorization Code gegen Access Token
    const exchangeCodeForTokens = async (code: string) => {
        setIsConnecting(true);
        setErrorMessage('');

        try {
            const tokenResponse = await AuthSession.exchangeCodeAsync({
                clientId: SPOTIFY_CLIENT_ID,
                code,
                redirectUri: REDIRECT_URI,
                extraParams: {
                    code_verifier: request?.codeVerifier || '',
                },
            }, discovery);

            const { accessToken, refreshToken, expiresIn } = tokenResponse;
            const expiration = Date.now() + (expiresIn || 3600) * 1000;

            const newTokens: SpotifyTokens = {
                accessToken,
                refreshToken: refreshToken || '',
                expiration,
            };

            // Speichere Tokens mit der Utility-Funktion
            await saveSpotifyTokens(newTokens);
            setTokens(newTokens);

        } catch (error) {
            setErrorMessage('Fehler bei der Spotify-Verbindung. Bitte versuche es erneut.');
            console.error('Spotify Auth Error:', error);
        } finally {
            setIsConnecting(false);
        }
    };

    // Logout-Funktion
    const handleLogout = async () => {
        Alert.alert(
            'Abmelden',
            'Möchtest du dich wirklich von Spotify abmelden?',
            [
                { text: 'Abbrechen', style: 'cancel' },
                {
                    text: 'Abmelden',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await clearSpotifyTokens();
                            setTokens(null);
                            await auth.signOut();
                            router.push('/login');
                        } catch (error) {
                            console.error('Logout-Fehler:', error);
                        }
                    }
                }
            ]
        );
    };

    // Neu verbinden
    const handleReconnect = async () => {
        setErrorMessage('');
        promptAsync();
    };

    // Loading Screen
    if (isLoading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator size="large" color="#1DB954" />
                <Text style={styles.loadingText}>Überprüfe Spotify-Verbindung...</Text>
            </SafeAreaView>
        );
    }

    // Login Screen - wird nur angezeigt wenn keine gültigen Tokens vorhanden
    return (
        <SafeAreaView style={styles.center}>
            <View style={styles.loginContainer}>
                <Ionicons name="logo-spotify" size={80} color="#1DB954" />
                <Text style={styles.title}>Spotify-Verbindung</Text>
                <Text style={styles.subtitle}>
                    Verbinde dein Spotify-Konto, um die Musik-Features zu nutzen
                </Text>

                {errorMessage && (
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={20} color="#ff6b6b" />
                        <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                )}

                <TouchableOpacity
                    onPress={() => promptAsync()}
                    style={[styles.loginBtn, isConnecting && styles.loginBtnDisabled]}
                    disabled={isConnecting}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {isConnecting ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Ionicons name="logo-spotify" size={20} color="white" />
                        )}
                        <Text style={[styles.btnText, { marginLeft: 8 }]}>
                            {isConnecting ? 'Verbinde...' : 'Mit Spotify verbinden'}
                        </Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.infoContainer}>
                    <Text style={styles.infoText}>
                        Wir benötigen Zugriff auf dein Spotify-Konto für:
                    </Text>
                    <Text style={styles.infoItem}>• Musik abspielen</Text>
                    <Text style={styles.infoItem}>• Playlists verwalten</Text>
                    <Text style={styles.infoItem}>• Songs suchen und hinzufügen</Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
        padding: 20
    },
    loginContainer: {
        alignItems: 'center',
        maxWidth: 300,
    },
    title: {
        fontSize: 28,
        color: '#1DB954',
        marginVertical: 20,
        textAlign: 'center',
        fontWeight: 'bold'
    },
    subtitle: {
        fontSize: 16,
        color: '#fff',
        marginBottom: 30,
        textAlign: 'center',
        lineHeight: 22
    },
    loadingText: {
        fontSize: 16,
        color: '#fff',
        marginTop: 20
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2d1b1b',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: '#ff6b6b'
    },
    errorText: {
        color: '#ff6b6b',
        fontSize: 14,
        marginLeft: 8,
        flex: 1
    },
    loginBtn: {
        backgroundColor: '#1DB954',
        padding: 16,
        borderRadius: 30,
        marginVertical: 10,
        alignItems: 'center',
        minWidth: 250,
        shadowColor: '#1DB954',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5
    },
    loginBtnDisabled: {
        backgroundColor: '#0d4f24'
    },
    btnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16
    },
    infoContainer: {
        marginTop: 30,
        padding: 20,
        backgroundColor: '#1a1a1a',
        borderRadius: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#1DB954'
    },
    infoText: {
        color: '#ccc',
        fontSize: 14,
        marginBottom: 10,
        fontWeight: '600'
    },
    infoItem: {
        color: '#aaa',
        fontSize: 13,
        marginVertical: 2,
        paddingLeft: 10
    }
});