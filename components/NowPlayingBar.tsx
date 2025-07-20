import React from 'react';
import { View, TouchableOpacity, Image, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NowPlayingBarProps {
    currentTrack: any;
    isPlaying: boolean;
    hasActiveOptions: boolean;
    onTogglePlayPause: () => void;
    onAddCurrentTrack: () => void;
}

export default function NowPlayingBar({
                                          currentTrack,
                                          isPlaying,
                                          hasActiveOptions,
                                          onTogglePlayPause,
                                          onAddCurrentTrack
                                      }: NowPlayingBarProps) {
    if (!currentTrack) return null;

    return (
        <View style={styles.container}>
            <Image
                source={{
                    uri: currentTrack.album.images[0]?.url || 'https://via.placeholder.com/48x48/E5E7EB/9CA3AF?text=♪'
                }}
                style={styles.artwork}
            />
            <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>{currentTrack.name}</Text>
                <Text style={styles.artist} numberOfLines={1}>
                    {currentTrack.artists.map((a: any) => a.name).join(', ')}
                </Text>
            </View>

            {hasActiveOptions && (
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={onAddCurrentTrack}
                >
                    <Ionicons name="add" size={16} color="white" />
                </TouchableOpacity>
            )}

            <TouchableOpacity onPress={onTogglePlayPause} style={styles.playButton}>
                <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={20}
                    color="white"
                />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 20,
        right: 20,
        bottom: 80,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    artwork: {
        width: 48,
        height: 48,
        borderRadius: 6,
    },
    info: {
        flex: 1,
        marginLeft: 12,
        gap: 2,
    },
    title: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1F2937',
    },
    artist: {
        fontSize: 12,
        color: '#6B7280',
    },
    addButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#10B981',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    playButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
});