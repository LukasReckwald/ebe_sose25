import React from 'react';
import { TouchableOpacity, View, Image, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GeoPlaylistCardProps {
    geoPlaylist: any;
    currentTrack: any;
    playlists: any[];
    onPress: (playlist: any) => void;
    onPlay: () => void;
    onAddCurrent: () => void;
}

export default function GeoPlaylistCard({
                                            geoPlaylist,
                                            currentTrack,
                                            playlists,
                                            onPress,
                                            onPlay,
                                            onAddCurrent
                                        }: GeoPlaylistCardProps) {

    // Safety check
    if (!geoPlaylist) {
        return null;
    }

    const handlePress = () => {
        if (!playlists || playlists.length === 0) {
            return;
        }

        const spotifyPlaylist = playlists.find(p => p.id === geoPlaylist.spotifyPlaylistId);

        if (spotifyPlaylist) {
            onPress(spotifyPlaylist);
        }
    };

    const handlePlay = (e: any) => {
        e.stopPropagation();
        onPlay();
    };

    const handleAddCurrent = (e: any) => {
        e.stopPropagation();
        onAddCurrent();
    };

    // Get image URL with fallback
    const imageUrl = geoPlaylist.spotifyPlaylistImage ||
        'https://via.placeholder.com/80x80/E5E7EB/9CA3AF?text=♪';

    // Get playlist name with fallback
    const playlistName = geoPlaylist.name || 'Unnamed Playlist';

    // Get radius with fallback
    const radius = geoPlaylist.radius || 0;

    return (
        <TouchableOpacity style={styles.card} onPress={handlePress}>
            <Image
                source={{ uri: imageUrl }}
                style={styles.image}
            />
            <View style={styles.info}>
                <Text style={styles.name}>{playlistName}</Text>
                <Text style={styles.meta}>
                    📍 Aktiv • {radius}m Radius
                </Text>
                {geoPlaylist.spotifyPlaylistName && (
                    <Text style={styles.spotifyName}>
                        🎵 {geoPlaylist.spotifyPlaylistName}
                    </Text>
                )}
            </View>
            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.playButton}
                    onPress={handlePlay}
                >
                    <Ionicons name="play" size={16} color="white" />
                </TouchableOpacity>
                {currentTrack && (
                    <TouchableOpacity
                        style={styles.addCurrentButton}
                        onPress={handleAddCurrent}
                    >
                        <Ionicons name="add" size={16} color="white" />
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
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
        borderWidth: 2,
        borderColor: '#10B981',
    },
    image: {
        width: 80,
        height: 80,
        borderRadius: 8,
        marginRight: 16,
        backgroundColor: '#E5E7EB', // Fallback background
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
    meta: {
        fontSize: 14,
        color: '#10B981',
        fontWeight: '500',
    },
    spotifyName: {
        fontSize: 12,
        color: '#6B7280',
        fontStyle: 'italic',
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    playButton: {
        backgroundColor: '#3B82F6',
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    addCurrentButton: {
        backgroundColor: '#10B981',
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
});