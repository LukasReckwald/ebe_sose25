import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GeoPlaylistCard from '../GeoPlaylistCard';
import PlaylistGrid from './PlaylistGrid';

interface OverviewTabProps {
    geoPlaylists?: any[]; // Optional: all geo playlists (for consistency with GeoPlaylistMapManager)
    activeGeoPlaylists: any[]; // Array of active GeoPlaylist objects (your current structure)
    playlists: any[];
    currentTrack: any;
    onPlaylistPress: (playlist: any) => void;
    onPlayPlaylist: (playlistId: string) => void;
    onAddCurrentToGeoPlaylist: (geoPlaylist: any) => void;
}

export default function OverviewTab({
                                        geoPlaylists,
                                        activeGeoPlaylists,
                                        playlists,
                                        currentTrack,
                                        onPlaylistPress,
                                        onPlayPlaylist,
                                        onAddCurrentToGeoPlaylist
                                    }: OverviewTabProps) {

    const activeGeoPlaylistObjects = activeGeoPlaylists || [];

    return (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Aktive Geo-Playlists */}
            {activeGeoPlaylistObjects.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionLabel}>🎵 Aktive Geo-Playlisten</Text>
                        <Text style={styles.sectionSubtitle}>
                            Du bist im Radius - Songs werden automatisch hinzugefügt
                        </Text>
                    </View>

                    {activeGeoPlaylistObjects.map((geoPlaylist, index) => {
                        return (
                            <GeoPlaylistCard
                                key={geoPlaylist.id}
                                geoPlaylist={geoPlaylist}
                                currentTrack={currentTrack}
                                playlists={playlists}
                                onPress={onPlaylistPress}
                                onPlay={() => {
                                    console.log('Playing geo playlist from OverviewTab:', geoPlaylist.name);
                                    onPlayPlaylist(geoPlaylist.spotifyPlaylistId);
                                }}
                                onAddCurrent={() => {
                                    console.log('Adding current track to geo playlist from OverviewTab:', geoPlaylist.name);
                                    onAddCurrentToGeoPlaylist(geoPlaylist);
                                }}
                            />
                        );
                    })}

                    {/* Info-Text für Add Current Button */}
                    <View style={styles.infoContainer}>
                        <View style={styles.infoIcon}>
                            <Ionicons name="information-circle" size={16} color="#6B7280" />
                        </View>
                        <Text style={styles.infoText}>
                            Tipp: Mit dem <Ionicons name="add-circle" size={14} color="#10B981" /> Button fügst du den aktuell spielenden Song zu deiner Geo-Playlist hinzu.
                        </Text>
                    </View>
                </View>
            )}

            {/* Show message when no active geo playlists */}
            {activeGeoPlaylistObjects.length === 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionLabel}>🎵 Aktive Geo-Playlisten</Text>
                        <Text style={styles.sectionSubtitle}>
                            Keine aktiven Geo-Playlisten in deiner Nähe
                        </Text>
                    </View>

                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>
                            📍 Gehe zu einem Ort mit einer aktiven Geo-Playlist oder aktiviere eine vorhandene Playlist in den Einstellungen
                        </Text>
                    </View>
                </View>
            )}

            {/* Deine Playlists */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionLabel}>Deine Spotify Playlists</Text>
                    <Text style={styles.sectionSubtitle}>
                        Tippe auf eine Playlist für Details
                    </Text>
                </View>

                <PlaylistGrid playlists={playlists} onPlaylistPress={onPlaylistPress} />
            </View>

            <View style={styles.bottomSpacing} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        marginBottom: 16,
    },
    sectionLabel: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#6B7280',
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#F3F4F6',
        padding: 12,
        borderRadius: 8,
        marginTop: 16,
        borderLeftWidth: 3,
        borderLeftColor: '#10B981',
    },
    infoIcon: {
        marginRight: 8,
        marginTop: 2,
    },
    infoText: {
        fontSize: 13,
        color: '#6B7280',
        flex: 1,
        lineHeight: 18,
    },
    infoHighlight: {
        fontWeight: '600',
        color: '#10B981',
    },
    emptyState: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    emptyStateText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
    },
    errorCard: {
        backgroundColor: '#FEE2E2',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    errorText: {
        fontSize: 14,
        color: '#DC2626',
        textAlign: 'center',
    },
    bottomSpacing: {
        height: 120,
        marginBottom: 20,
    },
});