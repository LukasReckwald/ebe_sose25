import React, { useEffect, useState } from "react";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    Alert,
    Image,
    View,
    ScrollView,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "@/firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { router } from "expo-router";
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import {
    getValidSpotifyTokens,
    spotifyAPICall,
    clearSpotifyTokens,
    SpotifyTokens
} from '@/utils/spotifyToken';

export default function ProfileScreen() {
    const [user, setUser] = useState(null);
    const [spotifyProfile, setSpotifyProfile] = useState<any>(null);
    const [tokens, setTokens] = useState<SpotifyTokens | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [spotifyStats, setSpotifyStats] = useState<any>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                router.replace("/login");
            } else {
                setUser(user);
                loadSpotifyData();
            }
        });

        return unsubscribe;
    }, []);

    const loadSpotifyData = async () => {
        try {
            const validTokens = await getValidSpotifyTokens();
            setTokens(validTokens);

            if (validTokens) {
                await loadSpotifyProfile();
                await loadSpotifyStats();
            }
        } catch (error) {
            // Spotify nicht verbunden - das ist ok
        } finally {
            setIsLoading(false);
        }
    };

    const loadSpotifyProfile = async () => {
        try {
            const profile = await spotifyAPICall('/me');
            setSpotifyProfile(profile);
        } catch (error) {
            console.error('Fehler beim Laden des Spotify-Profils:', error);
        }
    };

    const loadSpotifyStats = async () => {
        try {
            // Lade Playlisten für Statistiken
            const playlistsData = await spotifyAPICall('/me/playlists?limit=50');
            const totalPlaylists = playlistsData.total;

            // Lade Top Artists (falls verfügbar)
            let topArtist = null;
            try {
                const topArtistsData = await spotifyAPICall('/me/top/artists?limit=1&time_range=medium_term');
                topArtist = topArtistsData.items[0]?.name || null;
            } catch (error) {
                // Top Artists nicht verfügbar
            }

            // Lade Currently Playing
            let currentTrack = null;
            try {
                const currentData = await spotifyAPICall('/me/player/currently-playing');
                currentTrack = currentData?.item?.name || null;
            } catch (error) {
                // Nichts wird gerade gespielt
            }

            setSpotifyStats({
                totalPlaylists,
                topArtist,
                currentTrack,
                followers: spotifyProfile?.followers?.total || 0
            });
        } catch (error) {
            console.error('Fehler beim Laden der Spotify-Statistiken:', error);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            "Abmelden",
            "Möchtest du dich wirklich abmelden?",
            [
                { text: "Abbrechen", style: "cancel" },
                {
                    text: "Abmelden",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await signOut(auth);
                        } catch (error) {
                            console.error("Logout error:", error);
                            Alert.alert("Fehler", "Logout fehlgeschlagen");
                        }
                    }
                }
            ]
        );
    };

    const handleSpotifyDisconnect = async () => {
        Alert.alert(
            "Spotify trennen",
            "Möchtest du die Verbindung zu Spotify trennen?",
            [
                { text: "Abbrechen", style: "cancel" },
                {
                    text: "Trennen",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await clearSpotifyTokens();
                            setTokens(null);
                            setSpotifyProfile(null);
                            setSpotifyStats(null);
                            Alert.alert("Erfolg", "Spotify-Verbindung wurde getrennt");
                        } catch (error) {
                            Alert.alert("Fehler", "Fehler beim Trennen der Spotify-Verbindung");
                        }
                    }
                }
            ]
        );
    };

    const connectSpotify = () => {
        router.push('/spotify-auth');
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator size="large" color="#1F2937" />
                <Text style={styles.loadingText}>Lade Profil...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.pageTitle}>Profil</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Firebase User Profile Card */}
                {user && (
                    <View style={styles.profileCard}>
                        <Image
                            source={{
                                uri: user.photoURL || "https://via.placeholder.com/48/6B7280/FFFFFF?text=U"
                            }}
                            style={styles.profileImage}
                        />
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>{user.displayName || "Benutzer"}</Text>
                            <Text style={styles.profileEmail}>{user.email}</Text>
                        </View>
                        <View style={styles.firebaseBadge}>
                            <Ionicons name="shield-checkmark" size={16} color="white" />
                            <Text style={styles.badgeText}>Firebase</Text>
                        </View>
                    </View>
                )}

                {/* Spotify Profile Card */}
                {tokens && spotifyProfile ? (
                    <View style={styles.profileCard}>
                        <Image
                            source={{
                                uri: spotifyProfile.images?.[0]?.url || "https://via.placeholder.com/48/1DB954/FFFFFF?text=S"
                            }}
                            style={styles.profileImage}
                        />
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>{spotifyProfile.display_name}</Text>
                            <Text style={styles.profileEmail}>
                                {spotifyProfile.followers?.total || 0} Follower • {spotifyProfile.country || 'Unbekannt'}
                            </Text>
                        </View>
                        <View style={styles.spotifyBadge}>
                            <FontAwesome name="spotify" size={16} color="white" />
                            <Text style={styles.badgeText}>Connected</Text>
                        </View>
                    </View>
                ) : (
                    <View style={styles.profileCard}>
                        <View style={styles.disconnectedIcon}>
                            <FontAwesome name="spotify" size={24} color="#9CA3AF" />
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>Spotify nicht verbunden</Text>
                            <Text style={styles.profileEmail}>Verbinde dich für mehr Features</Text>
                        </View>
                        <TouchableOpacity onPress={connectSpotify} style={styles.connectButton}>
                            <Text style={styles.connectButtonText}>Verbinden</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Spotify Statistiken */}
                {tokens && spotifyStats && (
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Deine Spotify Statistiken</Text>
                        <View style={styles.statsContainer}>
                            <View style={styles.statCard}>
                                <Ionicons name="library" size={24} color="#3B82F6" />
                                <Text style={styles.statNumber}>{spotifyStats.totalPlaylists}</Text>
                                <Text style={styles.statLabel}>Playlisten</Text>
                            </View>

                            <View style={styles.statCard}>
                                <Ionicons name="people" size={24} color="#10B981" />
                                <Text style={styles.statNumber}>{spotifyStats.followers}</Text>
                                <Text style={styles.statLabel}>Follower</Text>
                            </View>

                            {spotifyStats.topArtist && (
                                <View style={styles.statCardWide}>
                                    <Ionicons name="star" size={20} color="#F59E0B" />
                                    <Text style={styles.statLabel}>Top Artist</Text>
                                    <Text style={styles.statValue}>{spotifyStats.topArtist}</Text>
                                </View>
                            )}

                            {spotifyStats.currentTrack && (
                                <View style={styles.statCardWide}>
                                    <Ionicons name="musical-note" size={20} color="#8B5CF6" />
                                    <Text style={styles.statLabel}>Gerade gespielt</Text>
                                    <Text style={styles.statValue}>{spotifyStats.currentTrack}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* Account Aktionen */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Account</Text>
                    <View style={styles.actionContainer}>
                        {tokens && (
                            <TouchableOpacity style={styles.actionButton} onPress={handleSpotifyDisconnect}>
                                <FontAwesome name="spotify" size={20} color="#4B5563" />
                                <Text style={styles.actionButtonText}>Spotify trennen</Text>
                                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={[styles.actionButton, styles.logoutButton]} onPress={handleLogout}>
                            <Ionicons name="log-out" size={20} color="#DC2626" />
                            <Text style={[styles.actionButtonText, styles.logoutButtonText]}>Abmelden</Text>
                            <Ionicons name="chevron-forward" size={20} color="#DC2626" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* App Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>App Info</Text>
                    <View style={styles.infoCard}>
                        <Text style={styles.infoText}>Diese App verbindet deine Spotify-Playlisten mit Standorten.</Text>
                        <Text style={styles.infoText}>Erstelle Geo-Playlisten und lass Musik automatisch starten!</Text>
                        <Text style={styles.versionText}>Version 1.0.0</Text>
                    </View>
                </View>

                {/* Bottom Spacing */}
                <View style={{ height: 30 }} />
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

    // Profile Cards
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginVertical: 8,
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
    disconnectedIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
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
    firebaseBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3B82F6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    spotifyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1DB954',
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
    connectButton: {
        backgroundColor: '#1DB954',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    connectButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },

    // Sections
    section: {
        marginBottom: 32,
        marginTop: 16,
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#4B5563',
        marginBottom: 16,
    },

    // Statistics
    statsContainer: {
        gap: 12,
    },
    statCard: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        minWidth: '45%',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statCardWide: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statNumber: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1F2937',
        marginHorizontal: 8,
    },
    statLabel: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    statValue: {
        fontSize: 14,
        color: '#1F2937',
        fontWeight: '600',
        flex: 1,
    },

    // Actions
    actionContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        overflow: 'hidden',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        gap: 12,
    },
    actionButtonText: {
        flex: 1,
        fontSize: 16,
        color: '#4B5563',
        fontWeight: '500',
    },
    logoutButton: {
        borderBottomWidth: 0,
    },
    logoutButtonText: {
        color: '#DC2626',
    },

    // Info Card
    infoCard: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    infoText: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
        marginBottom: 8,
    },
    versionText: {
        fontSize: 12,
        color: '#9CA3AF',
        fontStyle: 'italic',
        marginTop: 8,
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
});