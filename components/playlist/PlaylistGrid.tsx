import React from 'react';
import { View, TouchableOpacity, Image, Text, StyleSheet } from 'react-native';

interface PlaylistGridProps {
    playlists: any[];
    onPlaylistPress: (playlist: any) => void;
}

export default function PlaylistGrid({ playlists, onPlaylistPress }: PlaylistGridProps) {
    return (
        <View style={styles.grid}>
            {playlists.map((playlist: any) => (
                <TouchableOpacity
                    key={playlist.id}
                    style={styles.gridItem}
                    onPress={() => onPlaylistPress(playlist)}
                >
                    <Image
                        source={{
                            uri: playlist.images?.[0]?.url || 'https://via.placeholder.com/120x120/E5E7EB/9CA3AF?text=♪'
                        }}
                        style={styles.gridImage}
                    />
                    <Text style={styles.gridTitle} numberOfLines={2}>
                        {playlist.name}
                    </Text>
                    <Text style={styles.gridMeta}>
                        {playlist.tracks.total} Songs
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    gridItem: {
        width: '47%',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    gridImage: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 8,
        marginBottom: 8,
    },
    gridTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
        lineHeight: 18,
        height: 36,
    },
    gridMeta: {
        fontSize: 12,
        color: '#6B7280',
    },
});