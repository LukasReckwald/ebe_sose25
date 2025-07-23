import React, { useEffect, useState, useRef } from "react";
import {
    StyleSheet,
    View,
    ActivityIndicator,
    Text,
    Alert,
    Linking,
} from "react-native";
import MapView, { Marker, Circle } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    getValidSpotifyTokens,
    spotifyAPICall,
} from '@/utils/spotifyToken';
import { auth } from '@/firebaseConfig';
import {
    getFirestore,
    doc,
    updateDoc,
} from 'firebase/firestore';

import { useMapLocation } from '@/hooks/useMapLocation';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { useGeoPlaylistData } from '@/hooks/useGeoPlaylistData';
import { useSpotifyAPI } from '@/hooks/useSpotifyAPI';
import { useSpotifySync } from '@/hooks/useSpotifySync';
import { useBackgroundLocation } from '@/hooks/useBackgroundLocation';

import GeoPlaylistMapManager from '@/components/map/GeoPlaylistMapManager';
import { CreateGeoPlaylistModal } from '@/components/map/CreateGeoPlaylistModal';
import { InvitationSystem } from '@/components/InvitationSystem';
import QuickAddModal from "@/components/QuickAddModal";
import MapStatusBanner from "@/components/map/MapStatusBanner";
import MapControls from "@/components/map/MapControls";
import DevModeControls from "@/components/map/DevModeControls";

export default function GeoPlaylistMap() {
    // Location Hooks
    const { location, devMode, fakeLocation, setDevMode, setFakeLocation } = useMapLocation();
    const { userLocation } = useLocationTracking();
    const { isBackgroundEnabled, enableBackgroundLocation } = useBackgroundLocation();

    // Geo-Playlist Data Hook
    const {
        geoPlaylists,
        activeGeoPlaylists,
        isLoading,
        toggleGeoPlaylist,
        deleteGeoPlaylist,
        setActiveGeoPlaylists
    } = useGeoPlaylistData();

    // Spotify Sync Hook
    const {
        currentTrack,
        isPlaying,
        spotifyPlaylists,
        addCurrentTrackToGeoPlaylist,
        refreshPlaylistCovers
    } = useSpotifySync(geoPlaylists);

    // Spotify API Hook
    const tokens = null;
    const {
        playlists,
        togglePlayPause,
        addTrackToPlaylist
    } = useSpotifyAPI(tokens);

    // Local State
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [radius, setRadius] = useState(100);
    const [mapMode, setMapMode] = useState("normal");
    const mapRef = useRef(null);

    // Modal States
    const [showPlaylistModal, setShowPlaylistModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showInvitationModal, setShowInvitationModal] = useState(false);
    const [showQuickAddModal, setShowQuickAddModal] = useState(false);
    const [quickAddTrack, setQuickAddTrack] = useState<any>(null);
    const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);
    const [lastPlayedPlaylist, setLastPlayedPlaylist] = useState<string | null>(null);

    useEffect(() => {
        initializeApp();
    }, []);

    // Background Location
    useEffect(() => {
        if (geoPlaylists.length > 0 && !isBackgroundEnabled && auth.currentUser) {
            const timer = setTimeout(() => {
                Alert.alert(
                    'Background Geo-Playlists aktivieren?',
                    'Möchtest du Benachrichtigungen erhalten wenn Geo-Playlists verfügbar sind, auch wenn die App geschlossen ist?',
                    [
                        { text: 'Später', style: 'cancel' },
                        {
                            text: 'Aktivieren',
                            onPress: async () => {
                                const success = await enableBackgroundLocation();
                                if (success) {
                                    Alert.alert(
                                        'Aktiviert!',
                                        'Du erhältst nun Benachrichtigungen für Geo-Playlists im Hintergrund.'
                                    );
                                }
                            }
                        }
                    ]
                );
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [geoPlaylists.length, isBackgroundEnabled]);

    useEffect(() => {
        let interval: number;
        if (geoPlaylists.length > 0) {
            interval = setInterval(async () => {
                let currentPos;

                if (devMode && fakeLocation) {
                    currentPos = fakeLocation;
                } else if (userLocation) {
                    currentPos = userLocation;
                } else {
                    return;
                }

                await checkGeoPlaylists(currentPos);
            }, 2000);
        }

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [geoPlaylists, devMode, fakeLocation, userLocation, activeGeoPlaylists, lastPlayedPlaylist]);

    const initializeApp = async () => {
        if (!auth.currentUser) {
            Alert.alert("Fehler", "Bitte melde dich erst an");
            return;
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

    const playGeoPlaylist = async (geoPlaylist: any) => {
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
                "Geo-Playlist gestartet!",
                `"${geoPlaylist.spotifyPlaylistName}" wird jetzt gespielt`,
                [{ text: "Cool!", style: "default" }]
            );
        } catch (error) {
            try {
                const devices = await spotifyAPICall('/me/player/devices');

                if (devices.devices.length === 0) {
                    Alert.alert(
                        "Geo-Playlist bereit!",
                        `"${geoPlaylist.spotifyPlaylistName}" würde jetzt gespielt werden, aber kein Spotify-Gerät ist verfügbar.`,
                        [
                            { text: "Spotify öffnen", onPress: () => Linking.openURL('spotify://') },
                            { text: "OK" }
                        ]
                    );
                } else {
                    Alert.alert(
                        "Geo-Playlist gestartet!",
                        `"${geoPlaylist.spotifyPlaylistName}" sollte jetzt spielen`,
                        [{ text: "OK" }]
                    );
                }
            } catch (deviceError) {
                Alert.alert("Geo-Playlist", `Playlist "${geoPlaylist.spotifyPlaylistName}" ist bereit, aber Spotify ist nicht verfügbar.`);
            }
        }
    };

    const openQuickAddModal = (track: any) => {
        setQuickAddTrack(track);
        setShowQuickAddModal(true);
    };

    const addTrackToGeoPlaylistHandler = async (geoPlaylistId: string, trackUri: string, trackName: string) => {
        try {
            const geoPlaylist = geoPlaylists.find(p => p.id === geoPlaylistId);
            if (!geoPlaylist) {
                Alert.alert('Fehler', 'Geo-Playlist nicht gefunden.');
                return;
            }

            const tokens = await getValidSpotifyTokens();
            if (!tokens) {
                Alert.alert("Spotify nicht verbunden", "Bitte verbinde dich mit Spotify.");
                return;
            }

            await spotifyAPICall(`/playlists/${geoPlaylist.spotifyPlaylistId}/tracks`, {
                method: 'POST',
                body: JSON.stringify({
                    uris: [trackUri]
                })
            });

            Alert.alert('Erfolg!', `"${trackName}" wurde zu "${geoPlaylist.name}" hinzugefügt.`);
        } catch (error) {
            console.error('Error adding track to geo-playlist:', error);
            Alert.alert('Fehler', 'Track konnte nicht hinzugefügt werden.');
        }
    };

    const handleAddToPlaylist = async (playlistId: string, trackUri: string, trackName: string, playlist: any) => {
        try {
            setSelectedPlaylist(playlist);
            await addTrackToPlaylist(trackUri, trackName, playlistId, playlist);
            setShowQuickAddModal(false);
            setQuickAddTrack(null);
        } catch (error) {
            console.error('Error adding track to playlist:', error);
        }
    };

    const handleToggleGeoPlaylist = async (id: string) => {
        const playlist = geoPlaylists.find(p => p.id === id);
        if (!playlist) return;

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
                            const db = getFirestore();
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

        await toggleGeoPlaylist(id);
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

    const handleCreateModalClose = () => {
        setShowCreateModal(false);
        setSelectedLocation(null);
        setMapMode("normal");
    };

    const handleGeoPlaylistCreated = () => {
        refreshPlaylistCovers();
    };

    const handleDevModeToggle = (enabled: boolean) => {
        setDevMode(enabled);
        if (!enabled) {
            setMapMode("normal");
        }
    };

    const handleCreateNew = () => {
        setMapMode("select-location");
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

            <MapStatusBanner
                activeGeoPlaylists={activeGeoPlaylists}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                selectedPlaylist={selectedPlaylist}
                onTogglePlayPause={togglePlayPause}
                onAddCurrentTrack={() => {
                    if (currentTrack) {
                        openQuickAddModal(currentTrack);
                    } else {
                        Alert.alert('Kein Track', 'Es wird gerade kein Song abgespielt.');
                    }
                }}
            />

            {devMode && (
                <DevModeControls
                    mapMode={mapMode}
                    setMapMode={setMapMode}
                    fakeLocation={fakeLocation}
                    setFakeLocation={setFakeLocation}
                    geoPlaylists={geoPlaylists}
                    activeGeoPlaylists={activeGeoPlaylists}
                    location={location}
                    currentTrack={currentTrack}
                />
            )}

            <MapControls
                onCenterMap={centerMap}
                onShowPlaylists={() => setShowPlaylistModal(true)}
                onShowInvitations={() => setShowInvitationModal(true)}
                onCreateNew={handleCreateNew}
                devMode={devMode}
                onToggleDevMode={handleDevModeToggle}
                onResetFakeLocation={() => {
                    setFakeLocation(null);
                    setMapMode("normal");
                }}
            />

            <GeoPlaylistMapManager
                visible={showPlaylistModal}
                onClose={() => setShowPlaylistModal(false)}
                geoPlaylists={geoPlaylists}
                onToggle={handleToggleGeoPlaylist}
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

            <QuickAddModal
                visible={showQuickAddModal}
                track={quickAddTrack}
                activeGeoPlaylists={geoPlaylists.filter(gp => activeGeoPlaylists.includes(gp.id))}
                playlists={playlists}
                onClose={() => {
                    setShowQuickAddModal(false);
                    setQuickAddTrack(null);
                }}
                onAddToGeoPlaylist={(geoPlaylist, trackUri, trackName) => {
                    addTrackToGeoPlaylistHandler(geoPlaylist.id, trackUri, trackName);
                    setShowQuickAddModal(false);
                    setQuickAddTrack(null);
                }}
                onAddToPlaylist={handleAddToPlaylist}
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
});