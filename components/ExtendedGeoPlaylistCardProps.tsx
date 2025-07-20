import React from 'react';
import { TouchableOpacity, View, Image, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ExtendedGeoPlaylistCardProps {
    geoPlaylist: any;
    currentTrack: any;
    playlists: any[];
    isActive: boolean;
    onPress: (playlist: any) => void;
    onPlay: () => void;
    onAddCurrent: () => void;
    onToggle: () => void;
    onDelete: () => void;
    showControls?: boolean;
}

export function ExtendedGeoPlaylistCard({
                                            geoPlaylist,
                                            currentTrack,
                                            isActive,
                                            onAddCurrent,
                                            onToggle,
                                            onDelete,
                                            showControls = false
                                        }: ExtendedGeoPlaylistCardProps) {
    return (
        <View style={[
            styles.card,
            isActive && styles.activeCard
        ]}>
            <Image
                source={{
                    uri: geoPlaylist.spotifyPlaylistImage || 'https://via.placeholder.com/80x80/E5E7EB/9CA3AF?text=♪'
                }}
                style={styles.image}
            />

            <View style={styles.info}>
                <Text style={styles.name}>{geoPlaylist.name}</Text>
                <Text style={styles.spotifyName}>{geoPlaylist.spotifyPlaylistName}</Text>
                <Text style={styles.meta}>
                    📍 {geoPlaylist.radius}m • {geoPlaylist.isActive ? 'Aktiv' : 'Inaktiv'}
                    {isActive && ' • Im Radius'}
                </Text>
            </View>

            {showControls && (
                <View style={styles.controls}>
                    {currentTrack && isActive && (
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={onAddCurrent}
                        >
                            <Ionicons name="add" size={16} color="white" />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[styles.toggleButton, geoPlaylist.isActive && styles.toggleButtonActive]}
                        onPress={onToggle}
                    >
                        <Ionicons
                            name={geoPlaylist.isActive ? "pause" : "play"}
                            size={16}
                            color="white"
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={onDelete}
                    >
                        <Ionicons name="trash" size={16} color="white" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    activeCard: {
        borderColor: '#10B981',
        borderWidth: 2,
        backgroundColor: '#ECFDF5',
    },
    image: {
        width: 80,
        height: 80,
        borderRadius: 8,
        marginRight: 16,
    },
    info: {
        flex: 1,
        gap: 4,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    spotifyName: {
        fontSize: 14,
        color: '#3B82F6',
    },
    meta: {
        fontSize: 12,
        color: '#6B7280',
    },
    controls: {
        flexDirection: 'row',
        gap: 8,
    },
    addButton: {
        backgroundColor: '#10B981',
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toggleButton: {
        backgroundColor: '#6B7280',
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toggleButtonActive: {
        backgroundColor: '#10B981',
    },
    deleteButton: {
        backgroundColor: '#DC2626',
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
});