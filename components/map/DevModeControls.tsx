import React from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';

interface DevModeControlsProps {
    mapMode: string;
    setMapMode: (mode: string) => void;
    fakeLocation: any;
    setFakeLocation: (location: any) => void;
    geoPlaylists: any[];
    location: any;
}

export default function DevModeControls({
                                            mapMode,
                                            setMapMode,
                                            fakeLocation,
                                            setFakeLocation,
                                            geoPlaylists,
                                            location
                                        }: DevModeControlsProps) {
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

    return (
        <>
            {/* Debug Info */}
            <View style={styles.debugContainer}>
                <Text style={styles.debugTitle}>🐛 Debug Info</Text>
                <Text style={styles.debugText}>Geo-Playlisten: {geoPlaylists.length}</Text>
                <Text style={styles.debugText}>
                    Position: {fakeLocation ? "Fake" : "Real"}
                </Text>
                {geoPlaylists.length > 0 && (
                    <>
                        <Text style={styles.debugText}>Nächste Playlist:</Text>
                        {geoPlaylists.slice(0, 1).map(playlist => {
                            const currentPos = fakeLocation || location;
                            const distance = currentPos && playlist.location ?
                                getDistance(currentPos, playlist.location) : 0;
                            return (
                                <Text key={playlist.id} style={styles.debugText}>
                                    "{playlist.name}": {distance.toFixed(0)}m
                                </Text>
                            );
                        })}
                    </>
                )}
            </View>

            {/* Dev Mode Controls */}
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
        </>
    );
}

const styles = StyleSheet.create({
    debugContainer: {
        position: "absolute",
        top: 140,
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
        top: 20,
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
});