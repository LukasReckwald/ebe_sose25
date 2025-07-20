import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CreateTabProps {
    onCreatePlaylist: (name: string) => Promise<void>;
}

export default function CreateTab({ onCreatePlaylist }: CreateTabProps) {
    const [newPlaylistName, setNewPlaylistName] = useState('');

    const handleCreate = async () => {
        if (!newPlaylistName.trim()) return;

        await onCreatePlaylist(newPlaylistName);
        setNewPlaylistName('');
    };

    return (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionLabel}>Neue Playlist erstellen</Text>
                    <Text style={styles.sectionSubtitle}>
                        Erstelle eine neue Spotify Playlist
                    </Text>
                </View>

                <View style={styles.createPlaylistForm}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Playlist Name</Text>
                        <TextInput
                            value={newPlaylistName}
                            onChangeText={setNewPlaylistName}
                            placeholder="z.B. Meine neue Playlist"
                            style={styles.textInput}
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>

                    <TouchableOpacity
                        onPress={handleCreate}
                        style={[styles.createButton, !newPlaylistName.trim() && styles.buttonDisabled]}
                        disabled={!newPlaylistName.trim()}
                    >
                        <Ionicons name="add-circle" size={20} color="white" />
                        <Text style={styles.createButtonText}>Playlist erstellen</Text>
                    </TouchableOpacity>
                </View>
            </View>
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
    createPlaylistForm: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        color: '#1F2937',
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3B82F6',
        paddingVertical: 14,
        borderRadius: 8,
        gap: 8,
        elevation: 2,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    buttonDisabled: {
        backgroundColor: '#9CA3AF',
    },
    createButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});