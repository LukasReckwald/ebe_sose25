import React, { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, Alert, StyleSheet, SafeAreaView, ActivityIndicator, ScrollView
} from 'react-native';
import * as AuthSession from 'expo-auth-session';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
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
        if (!auth.currentUser) {
            router.push('/login');
            return;
        }

        loadAndValidateTokens();
    }, []);

    useEffect(() => {
        if (response?.type === 'success') {
            exchangeCodeForTokens(response.params.code);
        }
    }, [response]);

    useEffect(() => {
        if (tokens) {
            router.replace('/(tabs)/mapview');
        }
    }, [tokens]);

    const loadAndValidateTokens = async () => {
        try {
            const validTokens = await getValidSpotifyTokens();
            if (validTokens) {
                setTokens(validTokens);
            }
        } catch (error) {
            console.error('Fehler beim Laden der Tokens:', error);
            setTokens(null);
        } finally {
            setIsLoading(false);
        }
    };

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

            await saveSpotifyTokens(newTokens);
            setTokens(newTokens);

        } catch (error) {
            setErrorMessage('Fehler bei der Spotify-Verbindung. Bitte versuche es erneut.');
            console.error('Spotify Auth Error:', error);
        } finally {
            setIsConnecting(false);
        }
    };

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

    if (isLoading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator size="large" color="#1F2937" />
                <Text style={styles.loadingText}>Überprüfe Spotify-Verbindung...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="chevron-back" size={24} color="#6B7280" />
                </TouchableOpacity>
                <Text style={styles.pageTitle}>Spotify Verbindung</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Hero Section */}
                <View style={styles.heroSection}>
                    <View style={styles.logoContainer}>
                        <FontAwesome name="spotify" size={64} color="#1DB954" />
                    </View>
                    <Text style={styles.heroTitle}>Verbinde dein Spotify</Text>
                    <Text style={styles.heroSubtitle}>
                        Lass Musik automatisch an deinen Lieblingsorten abspielen
                    </Text>
                </View>

                {/* Error Message */}
                {errorMessage && (
                    <View style={styles.errorCard}>
                        <Ionicons name="alert-circle" size={20} color="#DC2626" />
                        <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                )}

                {/* Connect Button */}
                <View style={styles.connectSection}>
                    <TouchableOpacity
                        onPress={() => promptAsync()}
                        style={[styles.connectButton, isConnecting && styles.connectButtonDisabled]}
                        disabled={isConnecting}
                    >
                        {isConnecting ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <FontAwesome name="spotify" size={20} color="white" />
                        )}
                        <Text style={styles.connectButtonText}>
                            {isConnecting ? 'Verbinde...' : 'Mit Spotify verbinden'}
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.connectHint}>
                        Du wirst zu Spotify weitergeleitet um die Verbindung zu autorisieren
                    </Text>
                </View>

                {/* Features Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Was wird möglich?</Text>
                    <View style={styles.featuresContainer}>
                        <View style={styles.featureCard}>
                            <View style={styles.featureIcon}>
                                <Ionicons name="location" size={24} color="#10B981" />
                            </View>
                            <Text style={styles.featureTitle}>Geo-Playlisten</Text>
                            <Text style={styles.featureDescription}>
                                Erstelle Playlisten die automatisch an bestimmten Orten starten
                            </Text>
                        </View>

                        <View style={styles.featureCard}>
                            <View style={styles.featureIcon}>
                                <Ionicons name="play-circle" size={24} color="#3B82F6" />
                            </View>
                            <Text style={styles.featureTitle}>Automatische Wiedergabe</Text>
                            <Text style={styles.featureDescription}>
                                Musik startet automatisch wenn du deine Zonen betrittst
                            </Text>
                        </View>

                        <View style={styles.featureCard}>
                            <View style={styles.featureIcon}>
                                <Ionicons name="library" size={24} color="#8B5CF6" />
                            </View>
                            <Text style={styles.featureTitle}>Playlist-Verwaltung</Text>
                            <Text style={styles.featureDescription}>
                                Durchsuche, erstelle und bearbeite deine Spotify-Playlisten
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Permissions Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Benötigte Berechtigungen</Text>
                    <View style={styles.permissionsCard}>
                        <View style={styles.permissionItem}>
                            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                            <Text style={styles.permissionText}>Playlisten lesen und verwalten</Text>
                        </View>
                        <View style={styles.permissionItem}>
                            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                            <Text style={styles.permissionText}>Musik abspielen und steuern</Text>
                        </View>
                        <View style={styles.permissionItem}>
                            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                            <Text style={styles.permissionText}>Songs suchen und hinzufügen</Text>
                        </View>
                        <View style={styles.permissionItem}>
                            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                            <Text style={styles.permissionText}>Dein Profil und E-Mail lesen</Text>
                        </View>
                    </View>
                </View>

                {/* Security Note */}
                <View style={styles.securityNote}>
                    <Ionicons name="shield-checkmark" size={20} color="#6B7280" />
                    <View style={styles.securityText}>
                        <Text style={styles.securityTitle}>Sicher & Privat</Text>
                        <Text style={styles.securityDescription}>
                            Deine Spotify-Daten werden sicher gespeichert und nur für die App-Funktionen verwendet
                        </Text>
                    </View>
                </View>

                {/* Bottom Spacing */}
                <View style={styles.bottomSpacing} />
            </ScrollView>
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
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        gap: 16,
    },
    backButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pageTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1F2937',
    },

    // Hero Section
    heroSection: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    logoContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
        textAlign: 'center',
    },
    heroSubtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 20,
    },

    // Connect Section
    connectSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    connectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1DB954',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        gap: 12,
        elevation: 5,
        shadowColor: '#1DB954',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        minWidth: 250,
    },
    connectButtonDisabled: {
        backgroundColor: '#9CA3AF',
        elevation: 0,
        shadowOpacity: 0,
    },
    connectButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    connectHint: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
        marginTop: 12,
        paddingHorizontal: 40,
    },

    // Error Card
    errorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        gap: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#DC2626',
    },
    errorText: {
        color: '#DC2626',
        fontSize: 14,
        flex: 1,
        fontWeight: '500',
    },

    // Sections
    section: {
        marginBottom: 32,
    },
    sectionLabel: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 16,
    },

    // Features
    featuresContainer: {
        gap: 16,
    },
    featureCard: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    featureIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 6,
    },
    featureDescription: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },

    // Permissions
    permissionsCard: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        gap: 12,
    },
    permissionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    permissionText: {
        fontSize: 14,
        color: '#4B5563',
        fontWeight: '500',
    },

    // Security Note
    securityNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#F0FDF4',
        padding: 16,
        borderRadius: 12,
        gap: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#10B981',
        marginBottom: 20,
    },
    securityText: {
        flex: 1,
    },
    securityTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#065F46',
        marginBottom: 4,
    },
    securityDescription: {
        fontSize: 13,
        color: '#047857',
        lineHeight: 18,
    },

    // Loading & Center
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

    // Bottom Spacing
    bottomSpacing: {
        height: 40,
    },
});