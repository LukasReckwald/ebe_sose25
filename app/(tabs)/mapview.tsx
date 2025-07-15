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
} from "react-native";
import MapView, { Marker, Circle } from "react-native-maps";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    getValidSpotifyTokens,
    spotifyAPICall,
} from '@/utils/spotifyTokenUtils';

const GEOFENCE_TASK = "GEOFENCE_TASK";

interface GeoPlaylist {
    id: string;
    name: string;
    location: {
        latitude: number;
        longitude: number;
    };
    radius: number;
    spotifyPlaylistId: string;
    spotifyPlaylistName: string;
    spotifyPlaylistImage?: string;
    isActive: boolean;
}

export default function GeoPlaylistMap() {
    const [location, setLocation] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [radius, setRadius] = useState(100);
    const [devMode, setDevMode] = useState(false);
    const [fakeLocation, setFakeLocation] = useState(null);
    const [mapMode, setMapMode] = useState("normal"); // "normal", "fake-position", "select-location"
    const mapRef = useRef(null);

    // Playlist-bezogene States
    const [geoPlaylists, setGeoPlaylists] = useState<GeoPlaylist[]>([]);
    const [spotifyPlaylists, setSpotifyPlaylists] = useState<any[]>([]);
    const [showPlaylistModal, setShowPlaylistModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState("");
    const [selectedSpotifyPlaylist, setSelectedSpotifyPlaylist] = useState(null);
    const [activeGeoPlaylists, setActiveGeoPlaylists] = useState<string[]>([]);
    const [lastPlayedPlaylist, setLastPlayedPlaylist] = useState<string | null>(null);

    useEffect(() => {
        initializeApp();
    }, []);

    // Optimiertes Location Tracking für Geo-Playlisten
    useEffect(() => {
        let interval;
        if (geoPlaylists.length > 0) {
            interval = setInterval(async () => {
                let currentPos;

                if (devMode && fakeLocation) {
                    currentPos = fakeLocation;
                } else {
                    try {
                        const loc = await Location.getCurrentPositionAsync({
                            accuracy: Location.Accuracy.Balanced,
                            maximumAge: 10000,
                            timeout: 5000,
                        });
                        currentPos = loc.coords;
                    } catch (error) {
                        console.error("Fehler beim Abrufen der Position:", error);
                        return;
                    }
                }

                console.log("Current Position:", currentPos);
                await checkGeoPlaylists(currentPos);
            }, 5000);
        }

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [geoPlaylists, devMode, fakeLocation, activeGeoPlaylists, lastPlayedPlaylist]);

    // Separate Location Updates für Map Display
    useEffect(() => {
        let watchId;

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
                console.error("Fehler beim Starten des Location Watching:", error);
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
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Fehler", "Standortberechtigung nicht erteilt");
            return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        setLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
        });

        await loadGeoPlaylists();
        await loadSpotifyPlaylists();
        console.log("App initialisiert");
    };

    const loadGeoPlaylists = async () => {
        try {
            const saved = await AsyncStorage.getItem("geoPlaylists");
            if (saved) {
                const playlists = JSON.parse(saved);
                setGeoPlaylists(playlists);
            }
        } catch (error) {
            console.error("Fehler beim Laden der Geo-Playlisten:", error);
        }
    };

    const saveGeoPlaylists = async (playlists: GeoPlaylist[]) => {
        try {
            await AsyncStorage.setItem("geoPlaylists", JSON.stringify(playlists));
            setGeoPlaylists(playlists);
        } catch (error) {
            console.error("Fehler beim Speichern der Geo-Playlisten:", error);
        }
    };

    const loadSpotifyPlaylists = async () => {
        try {
            const tokens = await getValidSpotifyTokens();
            if (tokens) {
                const data = await spotifyAPICall('/me/playlists?limit=50');
                setSpotifyPlaylists(data.items);
            }
        } catch (error) {
            console.error("Fehler beim Laden der Spotify-Playlisten:", error);
        }
    };

    const checkGeoPlaylists = async (currentPos: any) => {
        console.log("Checking geo playlists...", {
            currentPos,
            geoPlaylistsCount: geoPlaylists.length,
            activeCount: geoPlaylists.filter(p => p.isActive).length
        });

        const currentlyActive: string[] = [];

        for (const geoPlaylist of geoPlaylists) {
            if (!geoPlaylist.isActive) {
                console.log(`Skipping inactive playlist: ${geoPlaylist.name}`);
                continue;
            }

            const distance = getDistance(currentPos, geoPlaylist.location);
            const isInZone = distance <= geoPlaylist.radius;

            console.log(`Playlist "${geoPlaylist.name}": distance=${distance.toFixed(0)}m, radius=${geoPlaylist.radius}m, inZone=${isInZone}`);

            if (isInZone) {
                currentlyActive.push(geoPlaylist.id);

                if (!activeGeoPlaylists.includes(geoPlaylist.id) &&
                    lastPlayedPlaylist !== geoPlaylist.id) {
                    console.log(`Entering zone for playlist: ${geoPlaylist.name}`);
                    await playGeoPlaylist(geoPlaylist);
                    setLastPlayedPlaylist(geoPlaylist.id);
                }
            }
        }

        console.log("Currently active geo-playlists:", currentlyActive);
        setActiveGeoPlaylists(currentlyActive);

        if (currentlyActive.length === 0 && activeGeoPlaylists.length > 0) {
            console.log("Left all zones, resetting lastPlayedPlaylist");
            setLastPlayedPlaylist(null);
        }
    };

    const playGeoPlaylist = async (geoPlaylist: GeoPlaylist) => {
        console.log(`Attempting to play geo-playlist: ${geoPlaylist.name}`);

        try {
            const tokens = await getValidSpotifyTokens();
            if (!tokens) {
                console.error("No valid Spotify tokens found");
                Alert.alert("Spotify nicht verbunden", "Bitte verbinde dich mit Spotify um Geo-Playlisten zu nutzen.");
                return;
            }

            console.log("Playing playlist:", geoPlaylist.spotifyPlaylistId);

            await spotifyAPICall('/me/player/play', {
                method: 'PUT',
                body: JSON.stringify({
                    context_uri: `spotify:playlist:${geoPlaylist.spotifyPlaylistId}`
                }),
            });

            console.log("Playlist started successfully");

            Alert.alert(
                "🎵 Geo-Playlist gestartet!",
                `"${geoPlaylist.spotifyPlaylistName}" wird jetzt gespielt`,
                [{ text: "Cool!", style: "default" }]
            );
        } catch (error) {
            console.error("Fehler beim Abspielen der Geo-Playlist:", error);

            try {
                const devices = await spotifyAPICall('/me/player/devices');
                console.log("Available devices:", devices.devices.length);

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
                        `"${geoPlaylist.spotifyPlaylistName}" sollte jetzt spielen (trotz API-Warnung)`,
                        [{ text: "OK" }]
                    );
                }
            } catch (deviceError) {
                console.error("Device check failed:", deviceError);
                Alert.alert("Geo-Playlist", `Playlist "${geoPlaylist.spotifyPlaylistName}" ist bereit, aber Spotify ist nicht verfügbar.`);
            }
        }
    };

    const createGeoPlaylist = async () => {
        if (!selectedLocation || !selectedSpotifyPlaylist || !newPlaylistName.trim()) {
            Alert.alert("Fehler", "Bitte alle Felder ausfüllen");
            return;
        }

        const newGeoPlaylist: GeoPlaylist = {
            id: Date.now().toString(),
            name: newPlaylistName.trim(),
            location: selectedLocation,
            radius: radius,
            spotifyPlaylistId: selectedSpotifyPlaylist.id,
            spotifyPlaylistName: selectedSpotifyPlaylist.name,
            spotifyPlaylistImage: selectedSpotifyPlaylist.images?.[0]?.url,
            isActive: true,
        };

        const updatedPlaylists = [...geoPlaylists, newGeoPlaylist];
        await saveGeoPlaylists(updatedPlaylists);

        setShowCreateModal(false);
        setSelectedLocation(null);
        setNewPlaylistName("");
        setSelectedSpotifyPlaylist(null);
        setMapMode("normal");

        Alert.alert("Erfolg!", `Geo-Playlist "${newGeoPlaylist.name}" wurde erstellt!`);
    };

    const toggleGeoPlaylist = async (id: string) => {
        const updatedPlaylists = geoPlaylists.map(playlist =>
            playlist.id === id
                ? { ...playlist, isActive: !playlist.isActive }
                : playlist
        );
        await saveGeoPlaylists(updatedPlaylists);
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
                        const updatedPlaylists = geoPlaylists.filter(p => p.id !== id);
                        await saveGeoPlaylists(updatedPlaylists);
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

    if (!location) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#1F2937" />
                <Text style={styles.loadingText}>Lade Standort...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                showsUserLocation={!devMode}
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

            {activeGeoPlaylists.length > 0 && (
                <View style={styles.statusBanner}>
                    <Text style={styles.statusText}>
                        🎵 {activeGeoPlaylists.length} Geo-Playlist{activeGeoPlaylists.length > 1 ? 's' : ''} aktiv
                    </Text>
                </View>
            )}

            {devMode && (
                <View style={styles.debugContainer}>
                    <Text style={styles.debugTitle}>🐛 Debug Info</Text>
                    <Text style={styles.debugText}>Geo-Playlisten: {geoPlaylists.length}</Text>
                    <Text style={styles.debugText}>Aktive Zonen: {activeGeoPlaylists.length}</Text>
                    <Text style={styles.debugText}>
                        Position: {fakeLocation ? "Fake" : "Real"}
                    </Text>
                    {geoPlaylists.length > 0 && (
                        <>
                            <Text style={styles.debugText}>Nächste Playlist:</Text>
                            {geoPlaylists.slice(0, 1).map(playlist => {
                                const currentPos = fakeLocation || location;
                                const distance = currentPos ? getDistance(currentPos, playlist.location) : 0;
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

            <View style={styles.fabContainer}>
                <TouchableOpacity style={styles.fab} onPress={centerMap}>
                    <Ionicons name="locate" size={24} color="white" />
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

                <TouchableOpacity
                    style={[styles.fab, styles.fabDev]}
                    onPress={() => {
                        setDevMode(!devMode);
                        if (!devMode) {
                            Alert.alert("Dev-Mode aktiviert", "Du kannst jetzt deine Position faken!");
                        } else {
                            setFakeLocation(null);
                            Alert.alert("Dev-Mode deaktiviert");
                        }
                    }}
                >
                    <Ionicons name={devMode ? "code" : "code-outline"} size={20} color="white" />
                </TouchableOpacity>
            </View>

            <Modal visible={showPlaylistModal} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Geo-Playlisten</Text>
                        <TouchableOpacity onPress={() => setShowPlaylistModal(false)}>
                            <Ionicons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        {geoPlaylists.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="musical-notes-outline" size={64} color="#9CA3AF" />
                                <Text style={styles.emptyStateTitle}>Keine Geo-Playlisten</Text>
                                <Text style={styles.emptyStateText}>Erstelle deine erste Geo-Playlist!</Text>
                            </View>
                        ) : (
                            geoPlaylists.map((playlist) => (
                                <View key={playlist.id} style={styles.playlistCard}>
                                    <Image
                                        source={{ uri: playlist.spotifyPlaylistImage || 'https://via.placeholder.com/60' }}
                                        style={styles.playlistImage}
                                    />
                                    <View style={styles.playlistInfo}>
                                        <Text style={styles.playlistName}>{playlist.name}</Text>
                                        <Text style={styles.playlistSpotify}>{playlist.spotifyPlaylistName}</Text>
                                        <Text style={styles.playlistDetails}>
                                            Radius: {playlist.radius}m • {playlist.isActive ? 'Aktiv' : 'Inaktiv'}
                                        </Text>
                                    </View>
                                    <View style={styles.playlistActions}>
                                        <TouchableOpacity
                                            style={[styles.toggleButton, playlist.isActive && styles.toggleButtonActive]}
                                            onPress={() => toggleGeoPlaylist(playlist.id)}
                                        >
                                            <Ionicons
                                                name={playlist.isActive ? "pause" : "play"}
                                                size={16}
                                                color="white"
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.deleteButton}
                                            onPress={() => deleteGeoPlaylist(playlist.id)}
                                        >
                                            <Ionicons name="trash" size={16} color="white" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Neue Geo-Playlist</Text>
                        <TouchableOpacity onPress={() => {
                            setShowCreateModal(false);
                            setSelectedLocation(null);
                            setMapMode("normal");
                        }}>
                            <Ionicons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        <View style={styles.inputSection}>
                            <Text style={styles.inputLabel}>Name der Geo-Playlist</Text>
                            <TextInput
                                value={newPlaylistName}
                                onChangeText={setNewPlaylistName}
                                placeholder="z.B. Gym Musik, Büro Vibes..."
                                style={styles.textInput}
                                placeholderTextColor="#9CA3AF"
                            />
                        </View>

                        <View style={styles.inputSection}>
                            <Text style={styles.inputLabel}>Radius: {radius}m</Text>
                            <Slider
                                minimumValue={10}
                                maximumValue={500}
                                step={10}
                                value={radius}
                                onValueChange={setRadius}
                                minimumTrackTintColor="#3B82F6"
                                maximumTrackTintColor="#E5E7EB"
                                thumbTintColor="#3B82F6"
                            />
                        </View>

                        <View style={styles.inputSection}>
                            <Text style={styles.inputLabel}>Spotify-Playlist auswählen</Text>
                            {selectedSpotifyPlaylist && (
                                <View style={styles.selectedPlaylistCard}>
                                    <Image
                                        source={{ uri: selectedSpotifyPlaylist.images?.[0]?.url || 'https://via.placeholder.com/40' }}
                                        style={styles.selectedPlaylistImage}
                                    />
                                    <Text style={styles.selectedPlaylistName}>{selectedSpotifyPlaylist.name}</Text>
                                </View>
                            )}

                            <ScrollView style={styles.spotifyPlaylistList} showsVerticalScrollIndicator={false}>
                                {spotifyPlaylists.map((playlist) => (
                                    <TouchableOpacity
                                        key={playlist.id}
                                        style={[
                                            styles.spotifyPlaylistItem,
                                            selectedSpotifyPlaylist?.id === playlist.id && styles.spotifyPlaylistItemSelected
                                        ]}
                                        onPress={() => setSelectedSpotifyPlaylist(playlist)}
                                    >
                                        <Image
                                            source={{ uri: playlist.images?.[0]?.url || 'https://via.placeholder.com/40' }}
                                            style={styles.spotifyPlaylistImage}
                                        />
                                        <Text style={styles.spotifyPlaylistName}>{playlist.name}</Text>
                                        <Text style={styles.spotifyPlaylistTracks}>{playlist.tracks.total} Songs</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.createButton,
                                (!newPlaylistName.trim() || !selectedSpotifyPlaylist) && styles.createButtonDisabled
                            ]}
                            onPress={createGeoPlaylist}
                            disabled={!newPlaylistName.trim() || !selectedSpotifyPlaylist}
                        >
                            <Text style={styles.createButtonText}>Geo-Playlist erstellen</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

// Task Manager für Background-Tracking
TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
    if (error) {
        console.error("Geofence Task Error:", error);
        return;
    }

    const { locations } = data;
    const currentLocation = locations?.[0]?.coords;
    if (!currentLocation) return;

    console.log("Background Position Update:", currentLocation);
});

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
    debugContainer: {
        position: "absolute",
        top: 60,
        left: 20,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        borderRadius: 8,
        minWidth: 200,
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
        top: 140,
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

    // Floating Action Buttons
    fabContainer: {
        position: "absolute",
        bottom: 30,
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
    fabDev: {
        backgroundColor: "#8B5CF6",
        width: 48,
        height: 48,
        borderRadius: 24,
    },

    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
        backgroundColor: "white",
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: "#1F2937",
    },
    modalContent: {
        flex: 1,
        padding: 20,
    },

    // Empty State
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 60,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#4B5563",
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 14,
        color: "#6B7280",
        textAlign: "center",
    },

    // Playlist Cards
    playlistCard: {
        flexDirection: "row",
        backgroundColor: "white",
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    playlistImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
    },
    playlistInfo: {
        flex: 1,
        marginLeft: 12,
    },
    playlistName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 4,
    },
    playlistSpotify: {
        fontSize: 14,
        color: "#3B82F6",
        marginBottom: 4,
    },
    playlistDetails: {
        fontSize: 12,
        color: "#6B7280",
    },
    playlistActions: {
        flexDirection: "row",
        gap: 8,
    },
    toggleButton: {
        backgroundColor: "#6B7280",
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    toggleButtonActive: {
        backgroundColor: "#10B981",
    },
    deleteButton: {
        backgroundColor: "#DC2626",
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },

    // Create Modal Styles
    inputSection: {
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        color: "#1F2937",
    },
    selectedPlaylistCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EBF8FF",
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#3B82F6",
    },
    selectedPlaylistImage: {
        width: 40,
        height: 40,
        borderRadius: 6,
        marginRight: 12,
    },
    selectedPlaylistName: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
    },
    spotifyPlaylistList: {
        maxHeight: 200,
        backgroundColor: "white",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    spotifyPlaylistItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    spotifyPlaylistItemSelected: {
        backgroundColor: "#EBF8FF",
    },
    spotifyPlaylistImage: {
        width: 40,
        height: 40,
        borderRadius: 6,
        marginRight: 12,
    },
    spotifyPlaylistName: {
        flex: 1,
        fontSize: 14,
        fontWeight: "500",
        color: "#1F2937",
    },
    spotifyPlaylistTracks: {
        fontSize: 12,
        color: "#6B7280",
    },
    createButton: {
        backgroundColor: "#3B82F6",
        padding: 16,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 20,
        marginBottom: 40,
    },
    createButtonDisabled: {
        backgroundColor: "#9CA3AF",
    },
    createButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "600",
    },
});