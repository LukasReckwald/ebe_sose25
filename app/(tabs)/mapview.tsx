// GeoPlaylistMap.tsx - Aktualisierte Version mit neuen Features
import React, { useEffect, useState, useRef } from "react";
import {
    StyleSheet,
    View,
    ActivityIndicator,
    TouchableOpacity,
    Text,
    Alert,
    Modal,
    ScrollView,
    Image,
    TextInput,
    Linking,
} from "react-native";
import MapView, { Marker, Circle } from "react-native-maps";
import * as Location from "expo-location";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    getValidSpotifyTokens,
    spotifyAPICall,
} from '@/utils/spotifyToken';
import { auth } from '@/firebaseConfig';
import {
    getFirestore,
    collection,
    doc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    where,
    orderBy
} from 'firebase/firestore';

// Importiere die neuen Komponenten
import { GeoPlaylistManager } from '@/components/GeoPlaylistManager';
import { CreateGeoPlaylistModal } from '@/components/CreateGeoPlaylistModal';
import { InvitationSystem } from '@/components/InvitationSystem';

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
    spotifyPlaylistImage?: string; // Optional field
    isActive: boolean;
    userId: string;
    createdAt: any;
    sharedWith?: string[];
    isShared?: boolean;
    originalOwnerId?: string;
}

export default function GeoPlaylistMap() {
    const [location, setLocation] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [radius, setRadius] = useState(100);
    const [devMode, setDevMode] = useState(false);
    const [fakeLocation, setFakeLocation] = useState(null);
    const [mapMode, setMapMode] = useState("normal");
    const mapRef = useRef(null);

    // Playlist-bezogene States
    const [geoPlaylists, setGeoPlaylists] = useState<GeoPlaylist[]>([]);
    const [spotifyPlaylists, setSpotifyPlaylists] = useState<any[]>([]);
    const [showPlaylistModal, setShowPlaylistModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showInvitationModal, setShowInvitationModal] = useState(false);
    const [activeGeoPlaylists, setActiveGeoPlaylists] = useState<string[]>([]);
    const [lastPlayedPlaylist, setLastPlayedPlaylist] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentTrack, setCurrentTrack] = useState<any>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        initializeApp();
    }, []);

    // Firebase Listener für Geo-Playlists
    useEffect(() => {
        if (!auth.currentUser) {
            setIsLoading(false);
            return;
        }

        const userId = auth.currentUser.uid;
        const db = getFirestore();
        const geoPlaylistsRef = collection(db, 'geoPlaylists');

        const q = query(
            geoPlaylistsRef,
            where('userId', '==', userId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const playlists: GeoPlaylist[] = [];
            snapshot.forEach((doc) => {
                playlists.push({
                    id: doc.id,
                    ...doc.data()
                } as GeoPlaylist);
            });

            // Sortiere nach createdAt
            playlists.sort((a, b) => {
                const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt) || new Date();
                const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt) || new Date();
                return bTime.getTime() - aTime.getTime();
            });

            setGeoPlaylists(playlists);
            setIsLoading(false);
        }, (error) => {
            console.error('Error loading geo-playlists:', error);
            Alert.alert('Fehler', 'Geo-Playlists konnten nicht geladen werden.');
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [auth.currentUser]);

    // Current Track Polling
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const data = await spotifyAPICall('/me/player');
                setCurrentTrack(data?.item || null);
                setIsPlaying(data?.is_playing || false);
            } catch (error) {
                setCurrentTrack(null);
                setIsPlaying(false);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // Optimiertes Location Tracking für Geo-Playlisten
    useEffect(() => {
        let interval: number;
        if (geoPlaylists.length > 0) {
            interval = setInterval(async () => {
                let currentPos;

                if (devMode && fakeLocation) {
                    currentPos = fakeLocation;
                } else {
                    try {
                        const loc = await Location.getCurrentPositionAsync({
                            accuracy: Location.Accuracy.Balanced,
                            maximumAge: 5000,
                            timeout: 3000,
                        });
                        currentPos = loc.coords;
                    } catch (error) {
                        return;
                    }
                }

                await checkGeoPlaylists(currentPos);
            }, 2000);
        }

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [geoPlaylists, devMode, fakeLocation, activeGeoPlaylists, lastPlayedPlaylist]);

    // Separate Location Updates für Map Display
    useEffect(() => {
        let watchId: { remove: any; };

        const startWatching = async () => {
            try {
                watchId = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.Balanced,
                        timeInterval: 5000,
                        distanceInterval: 10,
                    },
                    (loc) => {
                        if (!devMode) {
                            setLocation({
                                latitude: loc.coords.latitude,
                                longitude: loc.coords.longitude,
                            });
                        }
                    }
                );
            } catch (error) {
                // Ignore location watch errors
            }
        };

        startWatching();

        return () => {
            if (watchId) {
                watchId.remove();
            }
        };
    }, [devMode]);

    const initializeApp = async () => {
        // Check auth first
        if (!auth.currentUser) {
            Alert.alert("Fehler", "Bitte melde dich erst an");
            setIsLoading(false);
            return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Fehler", "Standortberechtigung nicht erteilt");
            setIsLoading(false);
            return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        setLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
        });

        await loadSpotifyPlaylists();
    };

    const loadSpotifyPlaylists = async () => {
        try {
            const tokens = await getValidSpotifyTokens();
            if (tokens) {
                const data = await spotifyAPICall('/me/playlists?limit=50');
                setSpotifyPlaylists(data.items);
            }
        } catch (error) {
            console.error('Error loading Spotify playlists:', error);
        }
    };

    const checkGeoPlaylists = async (currentPos: any) => {
        const currentlyActive: string[] = [];

        for (const geoPlaylist of geoPlaylists) {
            if (!geoPlaylist.isActive || !geoPlaylist.location) {
                continue;
            }

            const distance = getDistance(currentPos, geoPlaylist.location);
            const isInZone = distance <= geoPlaylist.radius;

            if (isInZone) {
                currentlyActive.push(geoPlaylist.id);

                if (!activeGeoPlaylists.includes(geoPlaylist.id) &&
                    lastPlayedPlaylist !== geoPlaylist.id) {
                    await playGeoPlaylist(geoPlaylist);
                    setLastPlayedPlaylist(geoPlaylist.id);
                }
            }
        }

        setActiveGeoPlaylists(currentlyActive);

        if (currentlyActive.length === 0 && activeGeoPlaylists.length > 0) {
            setLastPlayedPlaylist(null);
        }
    };

    const playGeoPlaylist = async (geoPlaylist: GeoPlaylist) => {
        try {
            const tokens = await getValidSpotifyTokens();
            if (!tokens) {
                Alert.alert("Spotify nicht verbunden", "Bitte verbinde dich mit Spotify um Geo-Playlisten zu nutzen.");
                return;
            }

            await spotifyAPICall('/me/player/play', {
                method: 'PUT',
                body: JSON.stringify({
                    context_uri: `spotify:playlist:${geoPlaylist.spotifyPlaylistId}`
                }),
            });

            Alert.alert(
                "🎵 Geo-Playlist gestartet!",
                `"${geoPlaylist.spotifyPlaylistName}" wird jetzt gespielt`,
                [{ text: "Cool!", style: "default" }]
            );
        } catch (error) {
            try {
                const devices = await spotifyAPICall('/me/player/devices');

                if (devices.devices.length === 0) {
                    Alert.alert(
                        "🎵 Geo-Playlist bereit!",
                        `"${geoPlaylist.spotifyPlaylistName}" würde jetzt gespielt werden, aber kein Spotify-Gerät ist verfügbar.`,
                        [
                            { text: "Spotify öffnen", onPress: () => Linking.openURL('spotify://') },
                            { text: "OK" }
                        ]
                    );
                } else {
                    Alert.alert(
                        "🎵 Geo-Playlist gestartet!",
                        `"${geoPlaylist.spotifyPlaylistName}" sollte jetzt spielen`,
                        [{ text: "OK" }]
                    );
                }
            } catch (deviceError) {
                Alert.alert("Geo-Playlist", `Playlist "${geoPlaylist.spotifyPlaylistName}" ist bereit, aber Spotify ist nicht verfügbar.`);
            }
        }
    };

    const toggleGeoPlaylist = async (id: string) => {
        try {
            const db = getFirestore();
            const playlist = geoPlaylists.find(p => p.id === id);
            if (!playlist) return;

            // Für geteilte Playlisten ohne Location, frage nach Standort
            if (playlist.isShared && !playlist.location) {
                if (!location) {
                    Alert.alert("Standort erforderlich", "Bitte warte bis dein Standort geladen wurde.");
                    return;
                }

                Alert.alert(
                    "Standort festlegen",
                    "Diese geteilte Playlist hat noch keinen Standort. Möchtest du deinen aktuellen Standort verwenden?",
                    [
                        { text: "Abbrechen", style: "cancel" },
                        {
                            text: "Ja, verwenden",
                            onPress: async () => {
                                const docRef = doc(db, 'geoPlaylists', id);
                                await updateDoc(docRef, {
                                    location: location,
                                    isActive: true
                                });
                            }
                        }
                    ]
                );
                return;
            }

            const docRef = doc(db, 'geoPlaylists', id);
            await updateDoc(docRef, {
                isActive: !playlist.isActive
            });
        } catch (error) {
            console.error('Error toggling geo-playlist:', error);
            Alert.alert("Fehler", "Status konnte nicht geändert werden.");
        }
    };

    const deleteGeoPlaylist = async (id: string) => {
        Alert.alert(
            "Löschen bestätigen",
            "Möchtest du diese Geo-Playlist wirklich löschen?",
            [
                { text: "Abbrechen", style: "cancel" },
                {
                    text: "Löschen",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const db = getFirestore();
                            await deleteDoc(doc(db, 'geoPlaylists', id));
                            console.log('Geo-playlist deleted:', id);
                        } catch (error) {
                            console.error('Error deleting geo-playlist:', error);
                            Alert.alert("Fehler", "Geo-Playlist konnte nicht gelöscht werden.");
                        }
                    }
                }
            ]
        );
    };

    const centerMap = () => {
        if (location && mapRef.current) {
            mapRef.current.animateToRegion({
                ...location,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });
        }
    };

    const getDistance = (point1: any, point2: any) => {
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

    const handleCreateModalClose = () => {
        setShowCreateModal(false);
        setSelectedLocation(null);
        setMapMode("normal");
    };

    const handleGeoPlaylistCreated = () => {
        // Reload playlists wird automatisch durch Firebase listener gemacht
        loadSpotifyPlaylists(); // Reload für neue Spotify playlists
    };

    if (isLoading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#1F2937" />
                <Text style={styles.loadingText}>Lade Geo-Playlists...</Text>
            </View>
        );
    }

    if (!location) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#1F2937" />
                <Text style={styles.loadingText}>Lade Standort...</Text>
            </View>
        );
    }

    if (!auth.currentUser) {
        return (
            <View style={[styles.container, styles.center]}>
                <Ionicons name="person-outline" size={60} color="#9CA3AF" />
                <Text style={styles.errorTitle}>Nicht angemeldet</Text>
                <Text style={styles.errorText}>
                    Bitte melde dich an, um Geo-Playlisten zu nutzen.
                </Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                showsUserLocation={!devMode}
                showsMyLocationButton={false}
                initialRegion={{ ...location, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
                onPress={(e) => {
                    if (mapMode === "select-location") {
                        setSelectedLocation(e.nativeEvent.coordinate);
                        setShowCreateModal(true);
                    } else if (mapMode === "fake-position") {
                        setFakeLocation(e.nativeEvent.coordinate);
                        setMapMode("normal");
                        Alert.alert("Fake Position gesetzt!", `Lat: ${e.nativeEvent.coordinate.latitude.toFixed(5)}, Lng: ${e.nativeEvent.coordinate.longitude.toFixed(5)}`);
                    }
                }}
            >
                {geoPlaylists.map((geoPlaylist) => (
                    <React.Fragment key={geoPlaylist.id}>
                        {geoPlaylist.location && (
                            <>
                                <Marker
                                    coordinate={geoPlaylist.location}
                                    title={geoPlaylist.name}
                                    description={geoPlaylist.spotifyPlaylistName}
                                    pinColor={geoPlaylist.isActive ? "#10B981" : "#6B7280"}
                                />
                                <Circle
                                    center={geoPlaylist.location}
                                    radius={geoPlaylist.radius}
                                    strokeColor={
                                        activeGeoPlaylists.includes(geoPlaylist.id)
                                            ? "rgba(16, 185, 129, 0.8)"
                                            : geoPlaylist.isActive
                                                ? "rgba(59, 130, 246, 0.8)"
                                                : "rgba(107, 114, 128, 0.5)"
                                    }
                                    fillColor={
                                        activeGeoPlaylists.includes(geoPlaylist.id)
                                            ? "rgba(16, 185, 129, 0.2)"
                                            : geoPlaylist.isActive
                                                ? "rgba(59, 130, 246, 0.2)"
                                                : "rgba(107, 114, 128, 0.1)"
                                    }
                                />
                            </>
                        )}
                    </React.Fragment>
                ))}

                {selectedLocation && (
                    <>
                        <Marker coordinate={selectedLocation} title="Neue Geo-Playlist" pinColor="#F59E0B" />
                        <Circle
                            center={selectedLocation}
                            radius={radius}
                            strokeColor="rgba(245, 158, 11, 0.8)"
                            fillColor="rgba(245, 158, 11, 0.2)"
                        />
                    </>
                )}

                {devMode && fakeLocation && (
                    <Marker
                        coordinate={fakeLocation}
                        title="Fake Position"
                        pinColor="#6B7280"
                        identifier="fake-location"
                    />
                )}
            </MapView>

            {/* Status Banner für aktive Playlisten */}
            {activeGeoPlaylists.length > 0 && (
                <View style={styles.statusBanner}>
                    <Text style={styles.statusText}>
                        🎵 {activeGeoPlaylists.length} Geo-Playlist{activeGeoPlaylists.length > 1 ? 's' : ''} aktiv
                    </Text>
                </View>
            )}

            {/* Current Track Banner */}
            {currentTrack && activeGeoPlaylists.length > 0 && (
                <View style={styles.currentTrackBanner}>
                    <Image source={{ uri: currentTrack.album.images[0]?.url }} style={styles.currentTrackImage} />
                    <View style={styles.currentTrackInfo}>
                        <Text style={styles.currentTrackTitle} numberOfLines={1}>{currentTrack.name}</Text>
                        <Text style={styles.currentTrackArtist} numberOfLines={1}>
                            {currentTrack.artists.map((a: any) => a.name).join(', ')}
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.currentTrackButton}>
                        <Ionicons name={isPlaying ? "pause" : "play"} size={16} color="white" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Debug Info */}
            {devMode && (
                <View style={styles.debugContainer}>
                    <Text style={styles.debugTitle}>🐛 Debug Info</Text>
                    <Text style={styles.debugText}>Geo-Playlisten: {geoPlaylists.length}</Text>
                    <Text style={styles.debugText}>Aktive Zonen: {activeGeoPlaylists.length}</Text>
                    <Text style={styles.debugText}>
                        Position: {fakeLocation ? "Fake" : "Real"}
                    </Text>
                    <Text style={styles.debugText}>
                        Current Track: {currentTrack ? "Yes" : "No"}
                    </Text>
                    {geoPlaylists.length > 0 && (
                        <>
                            <Text style={styles.debugText}>Nächste Playlist:</Text>
                            {geoPlaylists.slice(0, 1).map(playlist => {
                                const currentPos = fakeLocation || location;
                                const distance = currentPos && playlist.location ? getDistance(currentPos, playlist.location) : 0;
                                return (
                                    <Text key={playlist.id} style={styles.debugText}>
                                        "{playlist.name}": {distance.toFixed(0)}m
                                    </Text>
                                );
                            })}
                        </>
                    )}
                </View>
            )}

            {/* Dev Mode Controls */}
            {devMode && (
                <View style={styles.devModeContainer}>
                    <Text style={styles.devModeTitle}>🛠️ Dev-Mode</Text>
                    <TouchableOpacity
                        style={[styles.devButton, mapMode === "fake-position" && styles.devButtonActive]}
                        onPress={() => {
                            if (mapMode === "fake-position") {
                                setMapMode("normal");
                            } else {
                                setMapMode("fake-position");
                                Alert.alert("Fake Position Modus", "Tippe auf die Karte um deine Position zu setzen");
                            }
                        }}
                    >
                        <Text style={styles.devButtonText}>
                            {mapMode === "fake-position" ? "Abbrechen" : "Fake Position"}
                        </Text>
                    </TouchableOpacity>

                    {fakeLocation && (
                        <TouchableOpacity
                            style={[styles.devButton, styles.devButtonSecondary]}
                            onPress={() => {
                                setFakeLocation(null);
                                setMapMode("normal");
                                Alert.alert("Fake Position gelöscht");
                            }}
                        >
                            <Text style={styles.devButtonText}>Position löschen</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Floating Action Buttons */}
            <View style={styles.fabContainer}>
                <TouchableOpacity style={styles.fab} onPress={centerMap}>
                    <Ionicons name="locate" size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.fab, styles.fabSecondary]}
                    onPress={() => setShowInvitationModal(true)}
                >
                    <Ionicons name="mail" size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.fab, styles.fabSecondary]}
                    onPress={() => setShowPlaylistModal(true)}
                >
                    <Ionicons name="list" size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.fab, styles.fabPrimary]}
                    onPress={() => {
                        setMapMode("select-location");
                        Alert.alert("Standort wählen", "Tippe auf die Karte um einen Standort für deine neue Geo-Playlist zu wählen");
                    }}
                >
                    <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
            </View>

            {/* Dev Mode Toggle */}
            <TouchableOpacity
                style={[styles.fab, styles.fabDevLeft]}
                onPress={() => {
                    setDevMode(!devMode);
                    if (!devMode) {
                        Alert.alert("Dev-Mode aktiviert", "Du kannst jetzt deine Position faken und Debug-Infos sehen!");
                    } else {
                        setFakeLocation(null);
                        Alert.alert("Dev-Mode deaktiviert");
                    }
                }}
            >
                <Ionicons name={devMode ? "code" : "code-outline"} size={20} color="white" />
            </TouchableOpacity>

            {/* Modals */}
            <GeoPlaylistManager
                visible={showPlaylistModal}
                onClose={() => setShowPlaylistModal(false)}
                geoPlaylists={geoPlaylists}
                onToggle={toggleGeoPlaylist}
                onDelete={deleteGeoPlaylist}
                currentTrack={currentTrack}
                activeGeoPlaylists={activeGeoPlaylists}
            />

            <CreateGeoPlaylistModal
                visible={showCreateModal}
                onClose={handleCreateModalClose}
                selectedLocation={selectedLocation}
                radius={radius}
                setRadius={setRadius}
                spotifyPlaylists={spotifyPlaylists}
                onCreated={handleGeoPlaylistCreated}
            />

            <InvitationSystem
                visible={showInvitationModal}
                onClose={() => setShowInvitationModal(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    center: {
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        fontSize: 16,
        color: "#6B7280",
        marginTop: 16,
    },
    errorTitle: {
        fontSize: 20,
        color: "#DC2626",
        marginVertical: 15,
        fontWeight: '600',
    },
    errorText: {
        fontSize: 16,
        color: "#6B7280",
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 22,
    },
    map: {
        flex: 1,
    },
    statusBanner: {
        position: "absolute",
        top: 60,
        left: 20,
        right: 20,
        backgroundColor: "#10B981",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    statusText: {
        color: "white",
        fontSize: 16,
        fontWeight: "600",
    },
    currentTrackBanner: {
        position: "absolute",
        top: 120,
        left: 20,
        right: 20,
        backgroundColor: "#1F2937",
        padding: 12,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    currentTrackImage: {
        width: 40,
        height: 40,
        borderRadius: 6,
        marginRight: 12,
    },
    currentTrackInfo: {
        flex: 1,
    },
    currentTrackTitle: {
        color: "white",
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 2,
    },
    currentTrackArtist: {
        color: "#9CA3AF",
        fontSize: 12,
    },
    currentTrackButton: {
        backgroundColor: "#3B82F6",
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    debugContainer: {
        position: "absolute",
        top: 180,
        left: 20,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        borderRadius: 8,
        minWidth: 200,
        maxWidth: 250,
    },
    debugTitle: {
        color: "#10B981",
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 8,
    },
    debugText: {
        color: "white",
        fontSize: 12,
        marginBottom: 2,
    },
    devModeContainer: {
        position: "absolute",
        top: 60,
        right: 20,
        backgroundColor: "white",
        padding: 16,
        borderRadius: 12,
        minWidth: 160,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    devModeTitle: {
        color: "#1F2937",
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 12,
        textAlign: "center",
    },
    devButton: {
        backgroundColor: "#F3F4F6",
        padding: 8,
        borderRadius: 6,
        marginBottom: 8,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    devButtonActive: {
        backgroundColor: "#3B82F6",
        borderColor: "#3B82F6",
    },
    devButtonSecondary: {
        backgroundColor: "#FEF2F2",
        borderColor: "#FECACA",
    },
    devButtonText: {
        color: "#1F2937",
        fontSize: 12,
        fontWeight: "500",
        textAlign: "center",
    },
    fabContainer: {
        position: "absolute",
        bottom: 80,
        right: 20,
        gap: 12,
    },
    fab: {
        backgroundColor: "#1F2937",
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    fabSecondary: {
        backgroundColor: "#6B7280",
    },
    fabPrimary: {
        backgroundColor: "#3B82F6",
    },
    fabDevLeft: {
        position: "absolute",
        bottom: 80,
        left: 20,
        backgroundColor: "#8B5CF6",
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
});