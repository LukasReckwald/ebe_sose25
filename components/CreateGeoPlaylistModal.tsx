import React, { useState } from 'react';
import {
    View, Text, Modal, ScrollView, TouchableOpacity,
    TextInput, Alert, StyleSheet, Image, Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from "@react-native-community/slider";
import { auth } from '@/firebaseConfig';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { getValidSpotifyTokens, spotifyAPICall } from '@/utils/spotifyToken';

interface CreateGeoPlaylistModalProps {
    visible: boolean;
    onClose: () => void;
    selectedLocation: {
        latitude: number;
        longitude: number;
    } | null;
    radius: number;
    setRadius: (radius: number) => void;
    spotifyPlaylists: any[];
    onCreated: () => void;
}

export const CreateGeoPlaylistModal: React.FC<CreateGeoPlaylistModalProps> = ({
                                                                                  visible,
                                                                                  onClose,
                                                                                  selectedLocation,
                                                                                  radius,
                                                                                  setRadius,
                                                                                  spotifyPlaylists,
                                                                                  onCreated
                                                                              }) => {
    const [newPlaylistName, setNewPlaylistName] = useState("");
    const [selectedSpotifyPlaylist, setSelectedSpotifyPlaylist] = useState(null);
    const [createNewSpotifyPlaylist, setCreateNewSpotifyPlaylist] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const handleClose = () => {
        setNewPlaylistName("");
        setSelectedSpotifyPlaylist(null);
        setCreateNewSpotifyPlaylist(false);
        onClose();
    };

    const createSpotifyPlaylist = async (name: string) => {
        try {
            const profile = await spotifyAPICall('/me');
            const playlistData = await spotifyAPICall(`/users/${profile.id}/playlists`, {
                method: 'POST',
                body: JSON.stringify({
                    name: name,
                    description: `Automatisch erstellte Playlist für Geo-Playlist "${name}"`,
                    public: false
                }),
            });
            return playlistData;
        } catch (error) {
            console.error('Error creating Spotify playlist:', error);
            throw error;
        }
    };

    const createGeoPlaylist = async () => {
        if (!selectedLocation || !newPlaylistName.trim()) {
            Alert.alert("Fehler", "Bitte alle Felder ausfüllen");
            return;
        }

        if (!createNewSpotifyPlaylist && !selectedSpotifyPlaylist) {
            Alert.alert("Fehler", "Bitte wähle eine Spotify-Playlist aus oder erstelle eine neue");
            return;
        }

        if (!auth.currentUser) {
            Alert.alert("Fehler", "Du musst angemeldet sein");
            return;
        }

        setIsCreating(true);

        try {
            const db = getFirestore();
            let spotifyPlaylistData;

            if (createNewSpotifyPlaylist) {
                spotifyPlaylistData = await createSpotifyPlaylist(newPlaylistName.trim());
            } else {
                spotifyPlaylistData = selectedSpotifyPlaylist;
            }

            const newGeoPlaylist = {
                name: newPlaylistName.trim(),
                location: selectedLocation,
                radius: radius,
                spotifyPlaylistId: spotifyPlaylistData.id,
                spotifyPlaylistName: spotifyPlaylistData.name,
                spotifyPlaylistImage: spotifyPlaylistData.images?.[0]?.url ?? null,
                isActive: true,
                userId: auth.currentUser.uid,
                createdAt: new Date(),
                sharedWith: [],
                createdSpotifyPlaylist: createNewSpotifyPlaylist
            };

            await addDoc(collection(db, 'geoPlaylists'), newGeoPlaylist);

            Alert.alert(
                "Erfolg!",
                createNewSpotifyPlaylist
                    ? `Geo-Playlist "${newGeoPlaylist.name}" wurde erstellt und neue Spotify-Playlist "${spotifyPlaylistData.name}" angelegt!`
                    : `Geo-Playlist "${newGeoPlaylist.name}" wurde erstellt!`
            );

            handleClose();
            onCreated();
        } catch (error) {
            console.error('Error creating geo-playlist:', error);
            Alert.alert("Fehler", "Geo-Playlist konnte nicht erstellt werden.");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Neue Geo-Playlist</Text>
                    <TouchableOpacity onPress={handleClose}>
                        <Ionicons name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalContent}>
                    <View style={styles.inputSection}>
                        <Text style={styles.inputLabel}>Name der Geo-Playlist</Text>
                        <TextInput
                            value={newPlaylistName}
                            onChangeText={setNewPlaylistName}
                            placeholder="z.B. Gym Musik, Büro Vibes..."
                            style={styles.textInput}
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>

                    <View style={styles.inputSection}>
                        <Text style={styles.inputLabel}>Radius: {radius}m</Text>
                        <Slider
                            minimumValue={10}
                            maximumValue={500}
                            step={10}
                            value={radius}
                            onValueChange={setRadius}
                            minimumTrackTintColor="#3B82F6"
                            maximumTrackTintColor="#E5E7EB"
                            thumbTintColor="#3B82F6"
                        />
                    </View>

                    <View style={styles.inputSection}>
                        <Text style={styles.inputLabel}>Spotify-Playlist</Text>

                        {/* Option: Neue Playlist erstellen */}
                        <View style={styles.optionContainer}>
                            <View style={styles.optionHeader}>
                                <Ionicons name="add-circle" size={20} color="#10B981" />
                                <Text style={styles.optionTitle}>Neue Spotify-Playlist erstellen</Text>
                                <Switch
                                    value={createNewSpotifyPlaylist}
                                    onValueChange={setCreateNewSpotifyPlaylist}
                                    trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                                    thumbColor={createNewSpotifyPlaylist ? '#10B981' : '#9CA3AF'}
                                />
                            </View>
                            {createNewSpotifyPlaylist && (
                                <Text style={styles.optionDescription}>
                                    Eine neue Spotify-Playlist wird mit dem Namen "{newPlaylistName || 'Geo-Playlist'}" erstellt.
                                </Text>
                            )}
                        </View>

                        {/* Option: Existierende Playlist wählen */}
                        {!createNewSpotifyPlaylist && (
                            <View style={styles.optionContainer}>
                                <View style={styles.optionHeader}>
                                    <Ionicons name="list" size={20} color="#3B82F6" />
                                    <Text style={styles.optionTitle}>Existierende Playlist wählen</Text>
                                </View>

                                {selectedSpotifyPlaylist && (
                                    <View style={styles.selectedPlaylistCard}>
                                        <Image
                                            source={{ uri: selectedSpotifyPlaylist.images?.[0]?.url || 'https://via.placeholder.com/40' }}
                                            style={styles.selectedPlaylistImage}
                                        />
                                        <Text style={styles.selectedPlaylistName}>{selectedSpotifyPlaylist.name}</Text>
                                        <Text style={styles.selectedPlaylistTracks}>
                                            {selectedSpotifyPlaylist.tracks.total} Songs
                                        </Text>
                                    </View>
                                )}

                                <ScrollView
                                    style={styles.spotifyPlaylistList}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {spotifyPlaylists.map((playlist) => (
                                        <TouchableOpacity
                                            key={playlist.id}
                                            style={[
                                                styles.spotifyPlaylistItem,
                                                selectedSpotifyPlaylist?.id === playlist.id && styles.spotifyPlaylistItemSelected
                                            ]}
                                            onPress={() => setSelectedSpotifyPlaylist(playlist)}
                                        >
                                            <Image
                                                source={{ uri: playlist.images?.[0]?.url || 'https://via.placeholder.com/40' }}
                                                style={styles.spotifyPlaylistImage}
                                            />
                                            <View style={styles.playlistTextContainer}>
                                                <Text style={styles.spotifyPlaylistName}>{playlist.name}</Text>
                                                <Text style={styles.spotifyPlaylistTracks}>{playlist.tracks.total} Songs</Text>
                                            </View>
                                            {selectedSpotifyPlaylist?.id === playlist.id && (
                                                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.createButton,
                            (!newPlaylistName.trim() || (!createNewSpotifyPlaylist && !selectedSpotifyPlaylist)) && styles.createButtonDisabled
                        ]}
                        onPress={createGeoPlaylist}
                        disabled={!newPlaylistName.trim() || (!createNewSpotifyPlaylist && !selectedSpotifyPlaylist) || isCreating}
                    >
                        <Text style={styles.createButtonText}>
                            {isCreating ? 'Erstelle...' : 'Geo-Playlist erstellen'}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
        backgroundColor: "white",
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: "#1F2937",
    },
    modalContent: {
        flex: 1,
        padding: 20,
    },
    inputSection: {
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        color: "#1F2937",
    },
    optionContainer: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    optionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginLeft: 8,
        flex: 1,
    },
    optionDescription: {
        fontSize: 14,
        color: "#6B7280",
        marginTop: 8,
        fontStyle: "italic",
    },
    selectedPlaylistCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EBF8FF",
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#3B82F6",
    },
    selectedPlaylistImage: {
        width: 40,
        height: 40,
        borderRadius: 6,
        marginRight: 12,
    },
    selectedPlaylistName: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
        flex: 1,
    },
    selectedPlaylistTracks: {
        fontSize: 12,
        color: "#6B7280",
    },
    spotifyPlaylistList: {
        maxHeight: 200,
        backgroundColor: "#F9FAFB",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    spotifyPlaylistItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    spotifyPlaylistItemSelected: {
        backgroundColor: "#EBF8FF",
    },
    spotifyPlaylistImage: {
        width: 40,
        height: 40,
        borderRadius: 6,
        marginRight: 12,
    },
    playlistTextContainer: {
        flex: 1,
    },
    spotifyPlaylistName: {
        fontSize: 14,
        fontWeight: "500",
        color: "#1F2937",
        marginBottom: 2,
    },
    spotifyPlaylistTracks: {
        fontSize: 12,
        color: "#6B7280",
    },
    createButton: {
        backgroundColor: "#3B82F6",
        padding: 16,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 20,
        marginBottom: 40,
    },
    createButtonDisabled: {
        backgroundColor: "#9CA3AF",
    },
    createButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "600",
    },
});