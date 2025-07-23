import React from 'react';
import { TouchableOpacity, View, Image, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchResultItemProps {
    track: any;
    onPress: () => void;
}

export default function SearchResultItem({ track, onPress }: SearchResultItemProps) {
    return (
        <TouchableOpacity style={styles.item} onPress={onPress}>
            <Image
                source={{
                    uri: track.album.images?.[0]?.url || 'https://via.placeholder.com/50x50/E5E7EB/9CA3AF?text=♪'
                }}
                style={styles.image}
            />
            <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>{track.name}</Text>
                <Text style={styles.artist} numberOfLines={1}>
                    {track.artists.map((a: any) => a.name).join(', ')}
                </Text>
            </View>
            <TouchableOpacity
                style={styles.addButton}
                onPress={(e) => {
                    e.stopPropagation();
                    onPress();
                }}
            >
                <Ionicons name="add-circle" size={24} color="#10B981" />
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    image: {
        width: 50,
        height: 50,
        borderRadius: 8,
        marginRight: 12,
    },
    info: {
        flex: 1,
        gap: 4,
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
        padding: 8,
    },
});