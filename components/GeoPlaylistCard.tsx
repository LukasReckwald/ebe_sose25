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

    const imageUrl = geoPlaylist.spotifyPlaylistImage ||
        'https://via.placeholder.com/80x80/E5E7EB/9CA3AF?text=♪';

    const playlistName = geoPlaylist.name || 'Unnamed Playlist';

    const radius = geoPlaylist.radius || 0;

    const isShared = geoPlaylist.isShared || false;

    return (
        <TouchableOpacity
            style={[
                styles.card,
                isShared && styles.sharedCard
            ]}
            onPress={handlePress}
        >
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: imageUrl }}
                    style={styles.image}
                />
                {isShared && (
                    <View style={styles.sharedBadge}>
                        <Ionicons name="people" size={12} color="white" />
                    </View>
                )}
            </View>

            <View style={styles.info}>
                <View style={styles.nameRow}>
                    <Text style={styles.name}>{playlistName}</Text>
                    {isShared && (
                        <View style={styles.sharedIndicator}>
                            <Ionicons name="share" size={12} color="#8B5CF6" />
                            <Text style={styles.sharedText}>Geteilt</Text>
                        </View>
                    )}
                </View>

                <Text style={styles.meta}>
                    <Ionicons name="location" size={14} color="#10B981" /> Aktiv • {radius}m Radius
                </Text>

                {geoPlaylist.spotifyPlaylistName && (
                    <Text style={styles.spotifyName}>
                        <Ionicons name="musical-notes" size={12} color="#6B7280" /> {geoPlaylist.spotifyPlaylistName}
                    </Text>
                )}

                {isShared && geoPlaylist.fromUserEmail && (
                    <Text style={styles.sharedFromText}>
                        <Ionicons name="person" size={10} color="#8B5CF6" /> Von: {geoPlaylist.fromUserEmail}
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

                {/* Zeige Add-Button nur für eigene Playlisten und nur wenn currentTrack vorhanden */}
                {currentTrack && !isShared && (
                    <TouchableOpacity
                        style={styles.addCurrentButton}
                        onPress={handleAddCurrent}
                    >
                        <Ionicons name="add" size={16} color="white" />
                    </TouchableOpacity>
                )}

                {/* Zeige Schloss für geteilte Playlisten wenn currentTrack vorhanden */}
                {currentTrack && isShared && (
                    <TouchableOpacity
                        style={styles.lockButton}
                        onPress={(e) => {
                            e.stopPropagation();
                            // Nichts tun - Button ist nur visuell
                        }}
                        activeOpacity={1}
                    >
                        <Ionicons name="lock-closed" size={16} color="#9CA3AF" />
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
    sharedCard: {
        borderColor: '#8B5CF6',
        backgroundColor: '#FEFBFF',
    },
    imageContainer: {
        position: 'relative',
        marginRight: 16,
    },
    image: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#E5E7EB',
    },
    sharedBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#8B5CF6',
        borderRadius: 12,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
    },
    info: {
        flex: 1,
        gap: 4,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        flex: 1,
        minWidth: 0,
    },
    sharedIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        gap: 3,
    },
    sharedText: {
        fontSize: 10,
        color: '#8B5CF6',
        fontWeight: '500',
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
    sharedFromText: {
        fontSize: 10,
        color: '#8B5CF6',
        fontStyle: 'italic',
        marginTop: 2,
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
    lockButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
});