import React, {useState} from 'react';
import {
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {SafeAreaView} from 'react-native-safe-area-context';
import Slider from "@react-native-community/slider";
import {auth} from '@/firebaseConfig';
import {addDoc, collection, getFirestore} from 'firebase/firestore';
import {spotifyAPICall} from '@/utils/spotifyToken';

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
            return await spotifyAPICall(`/users/${profile.id}/playlists`, {
                method: 'POST',
                body: JSON.stringify({
                    name: name,
                    description: `Automatisch erstellte Playlist für Geo-Playlist "${name}"`,
                    public: false
                }),
            });
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
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={handleClose}>
                        <Ionicons name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>Neue Geo-Playlist</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView
                    style={styles.modalContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.scrollContainer}
                >
                    {/* Name Input Section */}
                    <View style={styles.inputCard}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="create" size={18} color="#3B82F6" />
                            <Text style={styles.sectionTitle}>Name der Geo-Playlist</Text>
                        </View>
                        <TextInput
                            value={newPlaylistName}
                            onChangeText={setNewPlaylistName}
                            placeholder="z.B. Gym Musik, Büro Vibes..."
                            style={styles.textInput}
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>

                    {/* Radius Section */}
                    <View style={styles.inputCard}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="location" size={18} color="#10B981" />
                            <Text style={styles.sectionTitle}>Radius: {radius}m</Text>
                        </View>
                        <Text style={styles.sectionSubtitle}>
                            Bestimme den Aktivierungsbereich deiner Geo-Playlist
                        </Text>
                        <Slider
                            minimumValue={10}
                            maximumValue={500}
                            step={10}
                            value={radius}
                            onValueChange={setRadius}
                            minimumTrackTintColor="#10B981"
                            maximumTrackTintColor="#E5E7EB"
                            thumbTintColor="#10B981"
                            style={styles.slider}
                        />
                    </View>

                    {/* Spotify Playlist Section */}
                    <View style={styles.sectionHeader}>
                        <Ionicons name="musical-notes" size={18} color="#1DB954" />
                        <Text style={styles.modalSectionTitle}>Spotify-Playlist</Text>
                    </View>
                    <Text style={styles.modalSectionSubtitle}>
                        Erstelle eine neue Playlist oder wähle eine existierende
                    </Text>

                    {/* Option: Neue Playlist erstellen */}
                    <TouchableOpacity
                        style={[
                            styles.optionCard,
                            createNewSpotifyPlaylist && styles.optionCardSelected
                        ]}
                        onPress={() => setCreateNewSpotifyPlaylist(!createNewSpotifyPlaylist)}
                    >
                        <View style={styles.imageContainer}>
                            <View style={[styles.optionIcon, { backgroundColor: '#10B981' }]}>
                                <Ionicons name="add-circle" size={24} color="white" />
                            </View>
                        </View>

                        <View style={styles.cardInfo}>
                            <Text style={styles.cardName}>Neue Spotify-Playlist erstellen</Text>
                            <Text style={styles.cardMeta}>
                                {createNewSpotifyPlaylist
                                    ? `Erstelle "${newPlaylistName || 'Geo-Playlist'}"`
                                    : 'Eine neue Playlist wird automatisch erstellt'
                                }
                            </Text>
                        </View>

                        <View style={styles.cardActions}>
                            <Switch
                                value={createNewSpotifyPlaylist}
                                onValueChange={setCreateNewSpotifyPlaylist}
                                trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                                thumbColor={createNewSpotifyPlaylist ? '#10B981' : '#9CA3AF'}
                            />
                        </View>
                    </TouchableOpacity>

                    {/* Selected Playlist Preview */}
                    {!createNewSpotifyPlaylist && selectedSpotifyPlaylist && (
                        <View style={styles.selectedPlaylistCard}>
                            <View style={styles.imageContainer}>
                                <Image
                                    source={{
                                        uri: selectedSpotifyPlaylist.images?.[0]?.url || 'https://via.placeholder.com/60x60/E5E7EB/9CA3AF?text=♪'
                                    }}
                                    style={styles.cardImage}
                                />
                            </View>
                            <View style={styles.cardInfo}>
                                <Text style={styles.cardName}>{selectedSpotifyPlaylist.name}</Text>
                                <Text style={styles.cardMeta}>
                                    <Ionicons name="musical-notes" size={12} color="#1DB954" /> {selectedSpotifyPlaylist.tracks.total} Songs
                                </Text>
                            </View>
                            <View style={styles.cardActions}>
                                <View style={styles.selectedBadge}>
                                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Spotify Playlist List */}
                    {!createNewSpotifyPlaylist && (
                        <>
                            <Text style={styles.playlistSectionTitle}>Existierende Playlists wählen:</Text>
                            <View style={styles.playlistContainer}>
                                {spotifyPlaylists && spotifyPlaylists.length > 0 ? (
                                    spotifyPlaylists.map((playlist) => (
                                        <TouchableOpacity
                                            key={playlist.id}
                                            style={[
                                                styles.playlistCard,
                                                selectedSpotifyPlaylist?.id === playlist.id && styles.playlistCardSelected
                                            ]}
                                            onPress={() => setSelectedSpotifyPlaylist(playlist)}
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
                                                <Text style={styles.cardMeta}>
                                                    <Ionicons name="musical-notes" size={12} color="#1DB954" /> {playlist.tracks?.total || 0} Songs
                                                </Text>
                                            </View>

                                            <View style={styles.cardActions}>
                                                {selectedSpotifyPlaylist?.id === playlist.id ? (
                                                    <View style={styles.selectedBadge}>
                                                        <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                                                    </View>
                                                ) : (
                                                    <View style={styles.selectButton}>
                                                        <Ionicons name="radio-button-off" size={22} color="#9CA3AF" />
                                                    </View>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="musical-notes-outline" size={48} color="#9CA3AF" />
                                        <Text style={styles.emptyStateText}>Keine Spotify-Playlists verfügbar</Text>
                                        <Text style={styles.emptyStateSubtext}>
                                            Erstelle zunächst Playlists in Spotify oder wähle "Neue Playlist erstellen"
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </>
                    )}

                    {/* Info Box */}
                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle" size={16} color="#6B7280" />
                        <Text style={styles.infoText}>
                            Geo-Playlists werden automatisch aktiviert, wenn du dich im festgelegten Bereich befindest.
                        </Text>
                    </View>

                    {/* Bottom Spacing */}
                    <View style={styles.bottomSpacing} />
                </ScrollView>

                {/* Fixed Create Button */}
                <View style={styles.fixedButtonContainer}>
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
                </View>
            </SafeAreaView>
        </Modal>
    );
};

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
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 0,
    },
    scrollContainer: {
        flexGrow: 1,
    },
    inputCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    modalSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 12,
        lineHeight: 20,
    },
    modalSectionSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 16,
        lineHeight: 20,
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
    slider: {
        height: 40,
        marginTop: 8,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    optionCardSelected: {
        borderColor: '#10B981',
        backgroundColor: '#F0FDF4',
    },
    selectedPlaylistCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EBF8FF',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#3B82F6',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    playlistContainer: {
        marginBottom: 20,
    },
    playlistCard: {
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
    playlistCardSelected: {
        borderColor: '#10B981',
        backgroundColor: '#F0FDF4',
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
    optionIcon: {
        width: 60,
        height: 60,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardInfo: {
        flex: 1,
        gap: 3,
    },
    cardName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
    },
    cardMeta: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    cardActions: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedBadge: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectButton: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    playlistSectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 12,
        marginTop: 8,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
    },
    emptyStateText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
        marginTop: 12,
        textAlign: 'center',
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#9CA3AF',
        marginTop: 4,
        textAlign: 'center',
        lineHeight: 20,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#F3F4F6',
        padding: 12,
        borderRadius: 8,
        gap: 8,
        marginBottom: 20,
    },
    infoText: {
        fontSize: 12,
        color: '#6B7280',
        lineHeight: 16,
        flex: 1,
    },
    bottomSpacing: {
        height: 100,
        marginBottom: 20,
    },
    fixedButtonContainer: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    createButton: {
        backgroundColor: '#3B82F6',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    createButtonDisabled: {
        backgroundColor: '#9CA3AF',
        elevation: 0,
        shadowOpacity: 0,
    },
    createButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});