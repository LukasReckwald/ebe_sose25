import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MapStatusBannerProps {
    activeGeoPlaylists: string[];
    currentTrack: any;
    isPlaying: boolean;
}

export default function MapStatusBanner({
                                            activeGeoPlaylists,
                                            currentTrack,
                                            isPlaying
                                        }: MapStatusBannerProps) {
    if (activeGeoPlaylists.length === 0) return null;

    return (
        <>
            {/* Status Banner für aktive Playlisten */}
            <View style={styles.statusBanner}>
                <View style={styles.statusContent}>
                    <Ionicons name="location" size={20} color="white" />
                    <Text style={styles.statusText}>
                        {activeGeoPlaylists.length} Geo-Playlist{activeGeoPlaylists.length > 1 ? 's' : ''} aktiv
                    </Text>
                </View>
            </View>

            {/* Current Track Banner */}
            {currentTrack && (
                <View style={styles.currentTrackBanner}>
                    <Image
                        source={{ uri: currentTrack.album.images[0]?.url }}
                        style={styles.currentTrackImage}
                    />
                    <View style={styles.currentTrackInfo}>
                        <Text style={styles.currentTrackTitle} numberOfLines={1}>
                            {currentTrack.name}
                        </Text>
                        <Text style={styles.currentTrackArtist} numberOfLines={1}>
                            {currentTrack.artists.map((a: any) => a.name).join(', ')}
                        </Text>
                    </View>
                    <View style={styles.playingIndicator}>
                        <Ionicons
                            name={isPlaying ? "musical-notes" : "pause"}
                            size={16}
                            color="#10B981"
                        />
                    </View>
                </View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    statusBanner: {
        position: "absolute",
        top: 20,
        left: 20,
        right: 20,
        backgroundColor: "#10B981",
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    statusContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        gap: 8,
    },
    statusText: {
        color: "white",
        fontSize: 16,
        fontWeight: "600",
    },
    currentTrackBanner: {
        position: "absolute",
        top: 80,
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
    playingIndicator: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(16, 185, 129, 0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
});