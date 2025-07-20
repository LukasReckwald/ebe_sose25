import React from 'react';
import { Modal, View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface QuickAddModalProps {
    visible: boolean;
    track: any;
    activeGeoPlaylists: any[];
    playlists: any[];
    onClose: () => void;
    onAddToGeoPlaylist: (geoPlaylist: any, trackUri: string, trackName: string) => void;
    onAddToPlaylist: (playlistId: string, trackUri: string, trackName: string, playlist: any) => void; // Erweiterte Signatur
}

export default function QuickAddModal({
                                          visible,
                                          track,
                                          activeGeoPlaylists,
                                          playlists,
                                          onClose,
                                          onAddToGeoPlaylist,
                                          onAddToPlaylist
                                      }: QuickAddModalProps) {
    if (!track) return null;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>Song hinzufügen</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.modalContent}>
                    {/* Track Preview */}
                    <View style={styles.trackPreview}>
                        <Image
                            source={{
                                uri: track.album?.images?.[0]?.url || 'https://via.placeholder.com/60x60/E5E7EB/9CA3AF?text=♪'
                            }}
                            style={styles.trackPreviewImage}
                        />
                        <View style={styles.trackPreviewInfo}>
                            <Text style={styles.trackPreviewTitle}>{track.name}</Text>
                            <Text style={styles.trackPreviewArtist}>
                                {track.artists?.map((a: any) => a.name).join(', ')}
                            </Text>
                        </View>
                    </View>

                    {/* Aktive Geo-Playlists */}
                    {activeGeoPlaylists.length > 0 && (
                        <>
                            <Text style={styles.modalSectionTitle}>📍 Aktive Geo-Playlists</Text>
                            <Text style={styles.modalSectionSubtitle}>
                                Du befindest dich im Radius dieser Playlists
                            </Text>
                            <ScrollView style={styles.playlistOptionsList}>
                                {activeGeoPlaylists.map((geoPlaylist) => (
                                    <TouchableOpacity
                                        key={geoPlaylist.id}
                                        style={styles.geoPlaylistOption}
                                        onPress={() => onAddToGeoPlaylist(geoPlaylist, track.uri, track.name)}
                                    >
                                        <Image
                                            source={{
                                                uri: geoPlaylist.spotifyPlaylistImage || 'https://via.placeholder.com/50x50/E5E7EB/9CA3AF?text=♪'
                                            }}
                                            style={styles.playlistOptionImage}
                                        />
                                        <View style={styles.playlistOptionInfo}>
                                            <Text style={styles.playlistOptionName}>{geoPlaylist.name}</Text>
                                            <Text style={styles.playlistOptionMeta}>
                                                📍 Aktiv • {geoPlaylist.radius}m Radius
                                            </Text>
                                        </View>
                                        <Ionicons name="add-circle" size={24} color="#10B981" />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </>
                    )}

                    {/* Normale Playlists */}
                    <Text style={styles.modalSectionTitle}>🎵 Normale Playlists</Text>
                    <Text style={styles.modalSectionSubtitle}>
                        Wähle eine deiner Spotify-Playlists
                    </Text>
                    <ScrollView style={styles.playlistOptionsList}>
                        {playlists.map((playlist: any) => (
                            <TouchableOpacity
                                key={playlist.id}
                                style={styles.normalPlaylistOption}
                                onPress={() => {
                                    // Alle Parameter korrekt übergeben
                                    onAddToPlaylist(playlist.id, track.uri, track.name, playlist);
                                }}
                            >
                                <Image
                                    source={{
                                        uri: playlist.images?.[0]?.url || 'https://via.placeholder.com/50x50/E5E7EB/9CA3AF?text=♪'
                                    }}
                                    style={styles.playlistOptionImage}
                                />
                                <View style={styles.playlistOptionInfo}>
                                    <Text style={styles.playlistOptionName}>{playlist.name}</Text>
                                    <Text style={styles.playlistOptionMeta}>
                                        {playlist.tracks.total} Songs • {playlist.owner.display_name}
                                    </Text>
                                </View>
                                <Ionicons name="add-circle" size={24} color="#3B82F6" />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1F2937',
    },
    modalContent: {
        flex: 1,
        padding: 20,
    },
    trackPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    trackPreviewImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 12,
    },
    trackPreviewInfo: {
        flex: 1,
    },
    trackPreviewTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    trackPreviewArtist: {
        fontSize: 14,
        color: '#6B7280',
    },
    modalSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 8,
        marginTop: 20,
    },
    modalSectionSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 16,
    },
    playlistOptionsList: {
        maxHeight: 300,
        marginBottom: 20,
    },
    geoPlaylistOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#10B981',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    normalPlaylistOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    playlistOptionImage: {
        width: 50,
        height: 50,
        borderRadius: 8,
        marginRight: 12,
    },
    playlistOptionInfo: {
        flex: 1,
    },
    playlistOptionName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    playlistOptionMeta: {
        fontSize: 12,
        color: '#10B981',
    },
});