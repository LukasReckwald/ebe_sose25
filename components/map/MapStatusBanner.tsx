import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NowPlayingBar from '@/components/NowPlayingBar';

interface MapStatusBannerProps {
    activeGeoPlaylists: string[];
    currentTrack: any;
    isPlaying: boolean;
    selectedPlaylist: any;
    onTogglePlayPause: () => void;
    onAddCurrentTrack: () => void;
}

export default function MapStatusBanner({
                                            activeGeoPlaylists,
                                            currentTrack,
                                            isPlaying,
                                            selectedPlaylist,
                                            onTogglePlayPause,
                                            onAddCurrentTrack
                                        }: MapStatusBannerProps) {
    return (
        <>
            {(currentTrack || activeGeoPlaylists.length > 0) && (
                <View style={styles.bannerContainer}>
                    {/* Current Track Banner */}
                    {currentTrack && (
                        <View style={styles.currentTrackBanner}>
                            <NowPlayingBar
                                currentTrack={currentTrack}
                                isPlaying={isPlaying}
                                hasActiveOptions={activeGeoPlaylists.length > 0 || selectedPlaylist}
                                onTogglePlayPause={onTogglePlayPause}
                                onAddCurrentTrack={onAddCurrentTrack}
                                position="top"
                            />
                        </View>
                    )}

                    {/* Status Banner für aktive Playlisten */}
                    {activeGeoPlaylists.length > 0 && (
                        <View style={styles.statusBanner}>
                            <View style={styles.geoIndicator}>
                                <Ionicons name="location" size={18} color="#10B981" />
                                <Text style={styles.geoIndicatorText}>
                                    {activeGeoPlaylists.length} aktive Geo-Playlist{activeGeoPlaylists.length > 1 ? 's' : ''}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    bannerContainer: {
        position: "absolute",
        top: 40,
        left: 0,
        right: 0,
        alignItems: "center",
        gap: 8,
    },
    statusBanner: {
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    geoIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#10B981',
    },
    geoIndicatorText: {
        fontSize: 14,
        color: '#10B981',
        marginLeft: 6,
        fontWeight: '600',
    },
    currentTrackBanner: {
        alignSelf: "stretch",
    },
});