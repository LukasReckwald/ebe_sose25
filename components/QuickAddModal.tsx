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
    onAddToPlaylist: (playlistId: string, trackUri: string, trackName: string, playlist: any) => void;
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

    const sharedGeoPlaylists = activeGeoPlaylists.filter(gp => gp.isShared);

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
                            <View style={styles.sectionHeader}>
                                <Ionicons name="location" size={18} color="#10B981" />
                                <Text style={styles.modalSectionTitle}>Aktive Geo-Playlists</Text>
                            </View>
                            <Text style={styles.modalSectionSubtitle}>
                                Du befindest dich im Radius dieser Playlists
                            </Text>

                            <ScrollView style={styles.playlistOptionsList}>
                                {activeGeoPlaylists.map((geoPlaylist) => {
                                    const isShared = geoPlaylist.isShared;

                                    return (
                                        <TouchableOpacity
                                            key={geoPlaylist.id}
                                            style={[
                                                styles.geoPlaylistCard,
                                                isShared && styles.sharedCard,
                                                isShared && styles.disabledCard
                                            ]}
                                            onPress={isShared ? undefined : () => onAddToGeoPlaylist(geoPlaylist, track.uri, track.name)}
                                            disabled={isShared}
                                        >
                                            <View style={styles.imageContainer}>
                                                <Image
                                                    source={{
                                                        uri: geoPlaylist.spotifyPlaylistImage || 'https://via.placeholder.com/60x60/E5E7EB/9CA3AF?text=♪'
                                                    }}
                                                    style={styles.cardImage}
                                                />
                                                {isShared && (
                                                    <View style={styles.sharedBadge}>
                                                        <Ionicons name="people" size={10} color="white" />
                                                    </View>
                                                )}
                                            </View>

                                            <View style={styles.cardInfo}>
                                                <View style={styles.nameRow}>
                                                    <Text style={styles.cardName}>{geoPlaylist.name}</Text>
                                                    {isShared && (
                                                        <View style={styles.sharedIndicator}>
                                                            <Ionicons name="share" size={10} color="#8B5CF6" />
                                                            <Text style={styles.sharedText}>Geteilt</Text>
                                                        </View>
                                                    )}
                                                </View>

                                                <Text style={styles.cardMeta}>
                                                    <Ionicons name="location" size={12} color="#10B981" />
                                                    {isShared ? 'Geteilt' : 'Aktiv'} • {geoPlaylist.radius}m Radius
                                                </Text>

                                                <Text style={styles.cardSpotify}>
                                                    <Ionicons name="musical-notes" size={10} color="#6B7280" /> {geoPlaylist.spotifyPlaylistName}
                                                </Text>
                                            </View>

                                            <View style={styles.cardActions}>
                                                {isShared ? (
                                                    <View style={styles.lockButton}>
                                                        <Ionicons name="lock-closed" size={18} color="#9CA3AF" />
                                                    </View>
                                                ) : (
                                                    <View style={styles.addButton}>
                                                        <Ionicons name="add-circle" size={22} color="#10B981" />
                                                    </View>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            {/* Info Text für geteilte Playlists */}
                            {sharedGeoPlaylists.length > 0 && (
                                <View style={styles.infoBox}>
                                    <Ionicons name="information-circle" size={16} color="#6B7280" />
                                    <Text style={styles.infoText}>
                                        Songs können nur zu eigenen Playlists hinzugefügt werden.
                                    </Text>
                                </View>
                            )}
                        </>
                    )}

                    {/* Normale Playlists */}
                    <View style={styles.sectionHeader}>
                        <Ionicons name="musical-notes" size={18} color="#3B82F6" />
                        <Text style={styles.modalSectionTitle}>Normale Playlists</Text>
                    </View>
                    <Text style={styles.modalSectionSubtitle}>
                        Wähle eine deiner Spotify-Playlists
                    </Text>

                    <ScrollView style={styles.playlistOptionsList}>
                        {playlists.map((playlist: any) => (
                            <TouchableOpacity
                                key={playlist.id}
                                style={styles.normalPlaylistCard}
                                onPress={() => {
                                    onAddToPlaylist(playlist.id, track.uri, track.name, playlist);
                                }}
                            >
                                <View style={styles.imageContainer}>
                                    <Image
                                        source={{
                                            uri: playlist.images?.[0]?.url || 'https://via.placeholder.com/60x60/E5E7EB/9CA3AF?text=♪'
                                        }}
                                        style={styles.cardImage}
                                    />
                                </View>

                                <View style={styles.cardInfo}>
                                    <Text style={styles.cardName}>{playlist.name}</Text>
                                    <Text style={styles.normalPlaylistMeta}>
                                        <Ionicons name="musical-notes" size={12} color="#3B82F6" /> {playlist.tracks.total} Songs • {playlist.owner.display_name}
                                    </Text>
                                </View>

                                <View style={styles.cardActions}>
                                    <View style={styles.addButton}>
                                        <Ionicons name="add-circle" size={22} color="#3B82F6" />
                                    </View>
                                </View>
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
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
        marginTop: 20,
    },
    modalSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    modalSectionSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 16,
        lineHeight: 20,
    },
    playlistOptionsList: {
        maxHeight: 250,
        marginBottom: 20,
    },
    geoPlaylistCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        borderWidth: 2,
        borderColor: '#10B981',
    },
    sharedCard: {
        borderColor: '#8B5CF6',
        backgroundColor: '#FEFBFF',
    },
    disabledCard: {
        opacity: 0.7,
    },
    normalPlaylistCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    imageContainer: {
        position: 'relative',
        marginRight: 12,
    },
    cardImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: '#E5E7EB',
    },
    sharedBadge: {
        position: 'absolute',
        top: -3,
        right: -3,
        backgroundColor: '#8B5CF6',
        borderRadius: 10,
        width: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardInfo: {
        flex: 1,
        gap: 3,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
    },
    cardName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
        flex: 1,
        minWidth: 0,
    },
    sharedIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 8,
        gap: 2,
    },
    sharedText: {
        fontSize: 9,
        color: '#8B5CF6',
        fontWeight: '500',
    },
    cardMeta: {
        fontSize: 13,
        color: '#10B981',
        fontWeight: '500',
    },
    normalPlaylistMeta: {
        fontSize: 13,
        color: '#3B82F6',
        fontWeight: '500',
    },
    cardSpotify: {
        fontSize: 11,
        color: '#6B7280',
        fontStyle: 'italic',
    },
    cardActions: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButton: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    lockButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#F3F4F6',
        padding: 12,
        borderRadius: 8,
        gap: 8,
        marginTop: 8,
    },
    infoText: {
        fontSize: 12,
        color: '#6B7280',
        lineHeight: 16,
        flex: 1,
    },
});