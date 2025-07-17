import React, { useState, useEffect } from 'react';
import {
    View, Text, Modal, ScrollView, TouchableOpacity,
    Alert, StyleSheet, Image, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '@/firebaseConfig';
import {
    getFirestore,
    collection,
    doc,
    query,
    where,
    onSnapshot,
    updateDoc,
    addDoc,
    deleteDoc,
    getDocs
} from 'firebase/firestore';

interface Invitation {
    id: string;
    from: string;
    to: string;
    geoPlaylistId: string;
    geoPlaylistName: string;
    spotifyPlaylistId: string;
    status: 'pending' | 'accepted' | 'declined';
    createdAt: any;
    fromUserName?: string;
    fromUserEmail?: string;
}

interface InvitationSystemProps {
    visible: boolean;
    onClose: () => void;
}

export const InvitationSystem: React.FC<InvitationSystemProps> = ({
                                                                      visible,
                                                                      onClose
                                                                  }) => {
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingInvitations, setProcessingInvitations] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!visible || !auth.currentUser) return;

        const db = getFirestore();
        const invitationsRef = collection(db, 'geoPlaylistInvitations');

        const q = query(
            invitationsRef,
            where('to', '==', auth.currentUser.uid),
            where('status', '==', 'pending')
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const invitationsList: Invitation[] = [];

            for (const docSnapshot of snapshot.docs) {
                const data = docSnapshot.data();

                // Lade User-Informationen des Senders
                try {
                    const usersRef = collection(db, 'users');
                    const userQuery = query(usersRef, where('uid', '==', data.from));
                    const userSnapshot = await getDocs(userQuery);

                    let fromUserName = 'Unbekannter User';
                    let fromUserEmail = '';

                    if (!userSnapshot.empty) {
                        const userData = userSnapshot.docs[0].data();
                        fromUserName = userData.displayName || userData.email || 'Unbekannter User';
                        fromUserEmail = userData.email || '';
                    }

                    invitationsList.push({
                        id: docSnapshot.id,
                        ...data,
                        fromUserName,
                        fromUserEmail
                    } as Invitation);
                } catch (error) {
                    console.error('Error loading user data:', error);
                    invitationsList.push({
                        id: docSnapshot.id,
                        ...data,
                        fromUserName: 'Unbekannter User',
                        fromUserEmail: ''
                    } as Invitation);
                }
            }

            setInvitations(invitationsList);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [visible, auth.currentUser]);

    const acceptInvitation = async (invitation: Invitation) => {
        if (!auth.currentUser) return;

        setProcessingInvitations(prev => new Set(prev).add(invitation.id));

        try {
            const db = getFirestore();

            // Erstelle eine Kopie der Geo-Playlist für den aktuellen User
            const newGeoPlaylist = {
                name: invitation.geoPlaylistName,
                location: null, // Wird beim ersten Aktivieren gesetzt
                radius: 100, // Standard-Radius
                spotifyPlaylistId: invitation.spotifyPlaylistId,
                spotifyPlaylistName: invitation.geoPlaylistName,
                spotifyPlaylistImage: null,
                isActive: false, // Zunächst inaktiv
                userId: auth.currentUser.uid,
                createdAt: new Date(),
                sharedWith: [],
                isShared: true,
                originalOwnerId: invitation.from,
                originalGeoPlaylistId: invitation.geoPlaylistId
            };

            await addDoc(collection(db, 'geoPlaylists'), newGeoPlaylist);

            // Aktualisiere Einladungsstatus
            await updateDoc(doc(db, 'geoPlaylistInvitations', invitation.id), {
                status: 'accepted',
                acceptedAt: new Date()
            });

            Alert.alert(
                'Einladung angenommen!',
                `Du hast Zugang zur Playlist "${invitation.geoPlaylistName}" erhalten. Du kannst sie in deinen Geo-Playlisten aktivieren.`
            );

        } catch (error) {
            console.error('Error accepting invitation:', error);
            Alert.alert('Fehler', 'Einladung konnte nicht angenommen werden.');
        } finally {
            setProcessingInvitations(prev => {
                const newSet = new Set(prev);
                newSet.delete(invitation.id);
                return newSet;
            });
        }
    };

    const declineInvitation = async (invitation: Invitation) => {
        setProcessingInvitations(prev => new Set(prev).add(invitation.id));

        try {
            const db = getFirestore();

            // Aktualisiere Einladungsstatus
            await updateDoc(doc(db, 'geoPlaylistInvitations', invitation.id), {
                status: 'declined',
                declinedAt: new Date()
            });

            Alert.alert('Einladung abgelehnt', 'Die Einladung wurde abgelehnt.');

        } catch (error) {
            console.error('Error declining invitation:', error);
            Alert.alert('Fehler', 'Einladung konnte nicht abgelehnt werden.');
        } finally {
            setProcessingInvitations(prev => {
                const newSet = new Set(prev);
                newSet.delete(invitation.id);
                return newSet;
            });
        }
    };

    const deleteInvitation = async (invitationId: string) => {
        try {
            const db = getFirestore();
            await deleteDoc(doc(db, 'geoPlaylistInvitations', invitationId));
        } catch (error) {
            console.error('Error deleting invitation:', error);
        }
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Einladungen</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#3B82F6" />
                        <Text style={styles.loadingText}>Lade Einladungen...</Text>
                    </View>
                ) : (
                    <ScrollView style={styles.modalContent}>
                        {invitations.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="mail-outline" size={64} color="#9CA3AF" />
                                <Text style={styles.emptyStateTitle}>Keine Einladungen</Text>
                                <Text style={styles.emptyStateText}>
                                    Du hast derzeit keine ausstehenden Einladungen zu Geo-Playlisten.
                                </Text>
                            </View>
                        ) : (
                            invitations.map((invitation) => (
                                <View key={invitation.id} style={styles.invitationCard}>
                                    <View style={styles.invitationHeader}>
                                        <Ionicons name="share" size={20} color="#8B5CF6" />
                                        <Text style={styles.invitationTitle}>Playlist-Einladung</Text>
                                    </View>

                                    <View style={styles.invitationContent}>
                                        <Text style={styles.invitationText}>
                                            <Text style={styles.senderName}>{invitation.fromUserName}</Text>
                                            {invitation.fromUserEmail && (
                                                <Text style={styles.senderEmail}> ({invitation.fromUserEmail})</Text>
                                            )}
                                            {' '}hat dich zur Geo-Playlist{' '}
                                            <Text style={styles.playlistName}>"{invitation.geoPlaylistName}"</Text>
                                            {' '}eingeladen.
                                        </Text>

                                        <View style={styles.playlistInfo}>
                                            <Ionicons name="musical-notes" size={16} color="#6B7280" />
                                            <Text style={styles.playlistInfoText}>
                                                Spotify-Playlist: {invitation.geoPlaylistName}
                                            </Text>
                                        </View>

                                        <Text style={styles.invitationDate}>
                                            {invitation.createdAt?.toDate?.()?.toLocaleDateString('de-DE', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </Text>
                                    </View>

                                    <View style={styles.invitationActions}>
                                        <TouchableOpacity
                                            style={[
                                                styles.actionButton,
                                                styles.declineButton,
                                                processingInvitations.has(invitation.id) && styles.actionButtonDisabled
                                            ]}
                                            onPress={() => declineInvitation(invitation)}
                                            disabled={processingInvitations.has(invitation.id)}
                                        >
                                            {processingInvitations.has(invitation.id) ? (
                                                <ActivityIndicator size="small" color="white" />
                                            ) : (
                                                <>
                                                    <Ionicons name="close" size={16} color="white" />
                                                    <Text style={styles.actionButtonText}>Ablehnen</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[
                                                styles.actionButton,
                                                styles.acceptButton,
                                                processingInvitations.has(invitation.id) && styles.actionButtonDisabled
                                            ]}
                                            onPress={() => acceptInvitation(invitation)}
                                            disabled={processingInvitations.has(invitation.id)}
                                        >
                                            {processingInvitations.has(invitation.id) ? (
                                                <ActivityIndicator size="small" color="white" />
                                            ) : (
                                                <>
                                                    <Ionicons name="checkmark" size={16} color="white" />
                                                    <Text style={styles.actionButtonText}>Annehmen</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
                    </ScrollView>
                )}
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
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    loadingText: {
        fontSize: 16,
        color: "#6B7280",
        marginTop: 16,
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 60,
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
    },
    invitationCard: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    invitationHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    invitationTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginLeft: 8,
    },
    invitationContent: {
        marginBottom: 16,
    },
    invitationText: {
        fontSize: 14,
        color: "#4B5563",
        lineHeight: 20,
        marginBottom: 12,
    },
    senderName: {
        fontWeight: "600",
        color: "#1F2937",
    },
    senderEmail: {
        color: "#6B7280",
        fontSize: 13,
    },
    playlistName: {
        fontWeight: "600",
        color: "#3B82F6",
    },
    playlistInfo: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    playlistInfoText: {
        fontSize: 13,
        color: "#6B7280",
        marginLeft: 6,
    },
    invitationDate: {
        fontSize: 12,
        color: "#9CA3AF",
        fontStyle: "italic",
    },
    invitationActions: {
        flexDirection: "row",
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 6,
    },
    actionButtonDisabled: {
        opacity: 0.6,
    },
    actionButtonText: {
        color: "white",
        fontSize: 14,
        fontWeight: "600",
    },
    declineButton: {
        backgroundColor: "#DC2626",
    },
    acceptButton: {
        backgroundColor: "#10B981",
    },
});