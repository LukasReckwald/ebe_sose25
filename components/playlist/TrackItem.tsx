import React from 'react';
import { TouchableOpacity, View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TrackItemProps {
    track: any;
    index: number;
    onPress: () => void;
}

export default function TrackItem({ track, index, onPress }: TrackItemProps) {
    return (
        <TouchableOpacity style={styles.item} onPress={onPress}>
            <Text style={styles.number}>{index + 1}</Text>
            <Image
                source={{
                    uri: track.album.images?.[0]?.url || 'https://via.placeholder.com/40x40/E5E7EB/9CA3AF?text=♪'
                }}
                style={styles.image}
            />
            <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>{track.name}</Text>
                <Text style={styles.artist} numberOfLines={1}>
                    {track.artists.map((a: any) => a.name).join(', ')}
                </Text>
            </View>
            <TouchableOpacity style={styles.playButton}>
                <Ionicons name="play-outline" size={16} color="#6B7280" />
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    number: {
        width: 24,
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginRight: 12,
    },
    image: {
        width: 40,
        height: 40,
        borderRadius: 6,
        marginRight: 12,
    },
    info: {
        flex: 1,
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
    playButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F9FAFB',
        justifyContent: 'center',
        alignItems: 'center',
    },
});