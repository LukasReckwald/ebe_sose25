import React, { useState, useEffect } from 'react';
import { Modal, ScrollView, View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '@/firebaseConfig';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { updatePlaylistImages, updateSinglePlaylistImage } from '@/utils/playlistImageUpdater';

interface GeoPlaylistMapManagerProps {
    visible: boolean;
    onClose: () => void;
    geoPlaylists: any[];
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
    currentTrack?: any;
    activeGeoPlaylists: string[];
    onAddTrack: (track: any) => void;
}

export default function GeoPlaylistMapManager({
                                                  visible,
                                                  onClose,
                                                  geoPlaylists,
                                                  onToggle,
                                                  onDelete,
                                                  currentTrack,
                                                  activeGeoPlaylists,
                                                  onAddTrack
                                              }: GeoPlaylistMapManagerProps) {

    const [showShareModal, setShowShareModal] = useState(false);
    const [selectedPlaylistForShare, setSelectedPlaylistForShare] = useState<any | null>(null);
    const [shareEmail, setShareEmail] = useState('');
    const [isUpdatingImages, setIsUpdatingImages] = useState(false);

    // Images automatisch beim Öffnen des Modals aktualisieren
    useEffect(() => {
        if (visible && auth.currentUser) {
            updateAllPlaylistImages();
        }
    }, [visible]);

    const updateAllPlaylistImages = async () => {
        if (!auth.currentUser) return;

        setIsUpdatingImages(true);
        try {
            await updatePlaylistImages(auth.currentUser.uid);
            // Hier könntest du ein Event auslösen, um die Parent-Komponente
            // zu informieren, dass die Playlists neu geladen werden sollen
        } catch (error) {
            console.error('Error updating playlist images:', error);
        } finally {
            setIsUpdatingImages(false);
        }
    };

    const sharePlaylist = async () => {
        if (!selectedPlaylistForShare || !shareEmail.trim()) {
            Alert.alert('Fehler', 'Bitte alle Felder ausfüllen.');
            return;
        }

        try {
            const db = getFirestore();

            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', shareEmail.trim()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                Alert.alert('User nicht gefunden', 'Kein User mit dieser Email gefunden.');
                return;
            }

            const targetUser = querySnapshot.docs[0];
            const targetUserId = targetUser.id;
            
            const invitation = {
                from: auth.currentUser?.uid,
                to: targetUserId,
                geoPlaylistId: selectedPlaylistForShare.id,
                geoPlaylistName: selectedPlaylistForShare.name,
                spotifyPlaylistId: selectedPlaylistForShare.spotifyPlaylistId,
                spotifyPlaylistName: selectedPlaylistForShare.spotifyPlaylistName,
                spotifyPlaylistImage: selectedPlaylistForShare.spotifyPlaylistImage,
                location: selectedPlaylistForShare.location,
                radius: selectedPlaylistForShare.radius,
                status: 'pending',
                createdAt: new Date(),
                invitationType: 'geoPlaylist',
                fromUserEmail: auth.currentUser?.email || ''
            };

            await addDoc(collection(db, 'geoPlaylistInvitations'), invitation);

            const locationInfo = selectedPlaylistForShare.location
                ? ` am Standort (${selectedPlaylistForShare.location.latitude.toFixed(4)}, ${selectedPlaylistForShare.location.longitude.toFixed(4)}) mit ${selectedPlaylistForShare.radius}m Radius`
                : '';

            Alert.alert(
                'Einladung gesendet!',
                `Einladung für "${selectedPlaylistForShare.name}"${locationInfo} wurde an ${shareEmail} gesendet.`
            );

            setShowShareModal(false);
            setShareEmail('');
            setSelectedPlaylistForShare(null);
        } catch (error) {
            console.error('Error sharing playlist:', error);
            Alert.alert('Fehler', 'Playlist konnte nicht geteilt werden.');
        }
    };

    const handleShare = (geoPlaylist: any) => {
        setSelectedPlaylistForShare(geoPlaylist);
        setShowShareModal(true);
    };

    const handleToggle = (geoPlaylist: any) => {
        onToggle(geoPlaylist.id);
    };

    const handleDelete = (geoPlaylist: any) => {
        Alert.alert(
            'Playlist löschen',
            `Möchtest du "${geoPlaylist.name}" wirklich löschen?`,
            [
                { text: 'Abbrechen', style: 'cancel' },
                {
                    text: 'Löschen',
                    style: 'destructive',
                    onPress: () => onDelete(geoPlaylist.id)
                }
            ]
        );
    };

    const renderPlaylistActions = (geoPlaylist: any) => (
        <View style={styles.allActions}>
            <TouchableOpacity
                style={styles.shareButton}
                onPress={() => handleShare(geoPlaylist)}
            >
                <Ionicons name="share" size={16} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.toggleButton, geoPlaylist.isActive && styles.toggleButtonActive]}
                onPress={() => handleToggle(geoPlaylist)}
            >
                <Ionicons
                    name={geoPlaylist.isActive ? "pause" : "play"}
                    size={16}
                    color="white"
                />
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(geoPlaylist)}
            >
                <Ionicons name="trash" size={16} color="white" />
            </TouchableOpacity>
        </View>
    );

    return (
        <>
            <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Geo-Playlisten verwalten</Text>
                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                style={styles.refreshAllButton}
                                onPress={updateAllPlaylistImages}
                                disabled={isUpdatingImages}
                            >
                                <Ionicons
                                    name="refresh"
                                    size={20}
                                    color={isUpdatingImages ? "#9CA3AF" : "#6B7280"}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                        {/* Update Status */}
                        {isUpdatingImages && (
                            <View style={styles.updateStatus}>
                                <Ionicons name="refresh" size={16} color="#3B82F6" />
                                <Text style={styles.updateStatusText}>
                                    Playlist-Cover werden aktualisiert...
                                </Text>
                            </View>
                        )}

                        {/* Aktive Playlisten */}
                        {activeGeoPlaylists.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>🎵 Aktive Playlisten</Text>
                                <Text style={styles.sectionSubtitle}>
                                    Du befindest dich im Radius dieser Playlists
                                </Text>

                                {geoPlaylists
                                    .filter(p => activeGeoPlaylists.includes(p.id))
                                    .map(geoPlaylist => (
                                        <View key={geoPlaylist.id} style={styles.playlistCardWithActions}>
                                            <View style={styles.cardContent}>
                                                <Image
                                                    source={{
                                                        uri: geoPlaylist.spotifyPlaylistImage || 'https://via.placeholder.com/80x80/E5E7EB/9CA3AF?text=♪'
                                                    }}
                                                    style={styles.playlistImage}
                                                />
                                                <View style={styles.playlistInfo}>
                                                    <Text style={styles.playlistName}>{geoPlaylist.name}</Text>
                                                    <Text style={styles.playlistMeta}>
                                                        📍 Aktiv • {geoPlaylist.radius}m Radius
                                                    </Text>
                                                    <Text style={styles.playlistSpotify}>
                                                        {geoPlaylist.spotifyPlaylistName}
                                                    </Text>
                                                </View>
                                            </View>
                                            {renderPlaylistActions(geoPlaylist)}
                                        </View>
                                    ))
                                }
                            </View>
                        )}

                        {/* Alle Playlisten */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Alle Geo-Playlisten</Text>
                            <Text style={styles.sectionSubtitle}>
                                Verwalte deine Geo-Playlisten
                            </Text>

                            {geoPlaylists.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Ionicons name="map-outline" size={64} color="#9CA3AF" />
                                    <Text style={styles.emptyStateTitle}>Keine Geo-Playlisten</Text>
                                    <Text style={styles.emptyStateText}>
                                        Erstelle deine erste Geo-Playlist auf der Karte!
                                    </Text>
                                </View>
                            ) : (
                                geoPlaylists.map((geoPlaylist) => (
                                    <View key={geoPlaylist.id} style={styles.playlistCardWithActions}>
                                        <View style={styles.cardContent}>
                                            <Image
                                                source={{
                                                    uri: geoPlaylist.spotifyPlaylistImage || 'https://via.placeholder.com/80x80/E5E7EB/9CA3AF?text=♪'
                                                }}
                                                style={styles.playlistImage}
                                            />
                                            <View style={styles.playlistInfo}>
                                                <Text style={styles.playlistName}>{geoPlaylist.name}</Text>
                                                <Text style={styles.playlistMeta}>
                                                    📍 {geoPlaylist.isActive ? 'Aktiv' : 'Inaktiv'} • {geoPlaylist.radius}m Radius
                                                </Text>
                                                <Text style={styles.playlistSpotify}>
                                                    {geoPlaylist.spotifyPlaylistName}
                                                </Text>
                                            </View>
                                        </View>
                                        {renderPlaylistActions(geoPlaylist)}
                                    </View>
                                ))
                            )}
                        </View>

                        <View style={styles.bottomSpacing} />
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* Share Modal - bleibt unverändert */}
            <Modal visible={showShareModal} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Playlist teilen</Text>
                        <TouchableOpacity onPress={() => setShowShareModal(false)}>
                            <Ionicons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalContent}>
                        <Text style={styles.selectedPlaylistName}>
                            Teile: {selectedPlaylistForShare?.name}
                        </Text>

                        <View style={styles.inputSection}>
                            <Text style={styles.inputLabel}>Email des Users</Text>
                            <TextInput
                                value={shareEmail}
                                onChangeText={setShareEmail}
                                placeholder="user@example.com"
                                style={styles.textInput}
                                placeholderTextColor="#9CA3AF"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.shareCompleteButton, !shareEmail.trim() && styles.buttonDisabled]}
                            onPress={sharePlaylist}
                            disabled={!shareEmail.trim()}
                        >
                            <Text style={styles.shareButtonText}>Einladung senden</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>
        </>
    );
}

// Neue Styles hinzufügen
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
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    refreshAllButton: {
        padding: 4,
    },
    updateStatus: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EBF8FF",
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        gap: 8,
    },
    updateStatusText: {
        fontSize: 14,
        color: "#3B82F6",
    },
    modalContent: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 16,
    },
    playlistCardWithActions: {
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
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    playlistImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
        marginRight: 16,
    },
    playlistInfo: {
        flex: 1,
        gap: 4,
    },
    playlistName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    playlistMeta: {
        fontSize: 14,
        color: '#10B981',
    },
    playlistSpotify: {
        fontSize: 12,
        color: '#6B7280',
    },
    allActions: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    shareButton: {
        backgroundColor: "#F59E0B",
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        elevation: 2,
        shadowColor: "#F59E0B",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    toggleButton: {
        backgroundColor: "#6B7280",
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        elevation: 2,
        shadowColor: "#6B7280",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    toggleButtonActive: {
        backgroundColor: "#10B981",
        shadowColor: "#10B981",
    },
    deleteButton: {
        backgroundColor: "#DC2626",
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        elevation: 2,
        shadowColor: "#DC2626",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#4B5563",
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 14,
        color: "#6B7280",
        textAlign: "center",
        lineHeight: 20,
        paddingHorizontal: 20,
    },
    bottomSpacing: {
        height: 120,
        marginBottom: 20,
    },
    selectedPlaylistName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 20,
        textAlign: "center",
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
    shareCompleteButton: {
        backgroundColor: "#8B5CF6",
        padding: 16,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 20,
    },
    buttonDisabled: {
        backgroundColor: "#9CA3AF",
    },
    shareButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "600",
    },
});