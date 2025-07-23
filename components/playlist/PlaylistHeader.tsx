import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PlaylistHeaderProps {
    title?: string;
    activeGeoPlaylists: any[];
}

export default function PlaylistHeader({ title = "Playlisten", activeGeoPlaylists }: PlaylistHeaderProps) {
    return (
        <View style={styles.header}>
            <Text style={styles.pageTitle}>{title}</Text>
            {activeGeoPlaylists.length > 0 && (
                <View style={styles.geoIndicator}>
                    <Ionicons name="location" size={16} color="#10B981" />
                    <Text style={styles.geoIndicatorText}>
                        {activeGeoPlaylists.length} aktive Geo-Playlist{activeGeoPlaylists.length > 1 ? 'en' : ''}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#1F2937',
    },
    geoIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginTop: 8,
    },
    geoIndicatorText: {
        fontSize: 12,
        color: '#10B981',
        marginLeft: 4,
        fontWeight: '600',
    },
});