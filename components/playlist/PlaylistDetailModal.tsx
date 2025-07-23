import React from 'react';
import { Modal, ScrollView, View, TouchableOpacity, Text, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import TrackItem from './TrackItem';

interface PlaylistDetailModalProps {
    visible: boolean;
    playlist: any;
    tracks: any[];
    currentTrack: any;
    onClose: () => void;
    onPlayPlaylist: (playlistId: string) => void;
    onPlayTrack: (trackUri: string) => void;
    onAddCurrentTrack: (playlist: any) => void;
}

export default function PlaylistDetailModal({
                                                visible,
                                                playlist,
                                                tracks,
                                                currentTrack,
                                                onClose,
                                                onPlayPlaylist,
                                                onPlayTrack,
                                                onAddCurrentTrack
                                            }: PlaylistDetailModalProps) {
    if (!playlist) return null;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="chevron-down" size={24} color="#6B7280" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Playlist Details</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView style={styles.content}>
                    {/* Playlist Header */}
                    <View style={styles.playlistHeader}>
                        <Image
                            source={{
                                uri: playlist.images?.[0]?.url || 'https://via.placeholder.com/120x120/E5E7EB/9CA3AF?text=♪'
                            }}
                            style={styles.playlistImage}
                        />
                        <View style={styles.playlistInfo}>
                            <Text style={styles.playlistTitle}>{playlist.name}</Text>
                            <Text style={styles.playlistMeta}>
                                {playlist.tracks.total} Songs • {playlist.owner.display_name}
                            </Text>
                            <View style={styles.playlistActions}>
                                <TouchableOpacity
                                    onPress={() => onPlayPlaylist(playlist.id)}
                                    style={styles.playButton}
                                >
                                    <Ionicons name="play" size={16} color="white" />
                                    <Text style={styles.playButtonText}>Abspielen</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Song Liste */}
                    <View style={styles.trackList}>
                        <Text style={styles.trackListTitle}>Songs</Text>
                        {tracks.map(({ track }: any, index: number) => (
                            <TrackItem
                                key={`${track.id}-${index}`}
                                track={track}
                                index={index}
                                onPress={() => onPlayTrack(track.uri)}
                            />
                        ))}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1F2937',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    playlistHeader: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    playlistImage: {
        width: 120,
        height: 120,
        borderRadius: 12,
        marginRight: 16,
    },
    playlistInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    playlistTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 6,
    },
    playlistMeta: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 16,
    },
    playlistActions: {
        flexDirection: 'row',
        gap: 8,
    },
    playButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3B82F6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    playButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
    },
    trackList: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    trackListTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 12,
    },
});