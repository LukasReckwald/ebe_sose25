import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
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
    getDocs,
    getDoc
} from 'firebase/firestore';

export function useInvitations(visible: boolean) {
    const [invitations, setInvitations] = useState<any[]>([]);
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
            const invitationsList: any[] = [];

            for (const docSnapshot of snapshot.docs) {
                const data = docSnapshot.data();

                try {
                    // Lade User-Informationen des Senders
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

                    // Lade die ursprüngliche Geo-Playlist Details
                    let originalPlaylistData = null;
                    if (data.geoPlaylistId) {
                        try {
                            const geoPlaylistDoc = await getDoc(doc(db, 'geoPlaylists', data.geoPlaylistId));
                            if (geoPlaylistDoc.exists()) {
                                originalPlaylistData = geoPlaylistDoc.data();
                            }
                        } catch (error) {
                            console.error('Error loading original playlist data:', error);
                        }
                    }

                    invitationsList.push({
                        id: docSnapshot.id,
                        ...data,
                        fromUserName,
                        fromUserEmail,
                        originalPlaylistData
                    });
                } catch (error) {
                    console.error('Error loading invitation data:', error);
                    invitationsList.push({
                        id: docSnapshot.id,
                        ...data,
                        fromUserName: 'Unbekannter User',
                        fromUserEmail: '',
                        originalPlaylistData: null
                    });
                }
            }

            setInvitations(invitationsList);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [visible, auth.currentUser]);

    const acceptInvitation = async (invitation: any) => {
        if (!auth.currentUser) return;

        setProcessingInvitations(prev => new Set(prev).add(invitation.id));

        try {
            const db = getFirestore();

            // Verwende die Daten aus der ursprünglichen Playlist
            const originalData = invitation.originalPlaylistData;

            // Erstelle eine Kopie der Geo-Playlist für den aktuellen User
            const newGeoPlaylist = {
                name: invitation.geoPlaylistName,
                location: originalData?.location || null, // Location aus der ursprünglichen Playlist übernehmen
                radius: originalData?.radius || 100, // Radius aus der ursprünglichen Playlist übernehmen
                spotifyPlaylistId: invitation.spotifyPlaylistId,
                spotifyPlaylistName: originalData?.spotifyPlaylistName || invitation.geoPlaylistName,
                spotifyPlaylistImage: originalData?.spotifyPlaylistImage || null,
                isActive: false, // Zunächst inaktiv
                userId: auth.currentUser.uid,
                createdAt: new Date(),
                sharedWith: [],
                isShared: true,
                originalOwnerId: invitation.from,
                originalGeoPlaylistId: invitation.geoPlaylistId,
                // Zusätzliche Metadaten für geteilte Playlists
                sharedAt: new Date(),
                lastSyncedAt: new Date()
            };

            await addDoc(collection(db, 'geoPlaylists'), newGeoPlaylist);

            // Aktualisiere Einladungsstatus
            await updateDoc(doc(db, 'geoPlaylistInvitations', invitation.id), {
                status: 'accepted',
                acceptedAt: new Date()
            });

            const locationText = originalData?.location
                ? `am Standort (${originalData.location.latitude.toFixed(4)}, ${originalData.location.longitude.toFixed(4)})`
                : 'ohne spezifischen Standort';

            Alert.alert(
                'Einladung angenommen!',
                `Du hast Zugang zur Playlist "${invitation.geoPlaylistName}" erhalten. Die Playlist ist ${locationText} mit einem ${originalData?.radius || 100}m Radius verfügbar.`
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

    const declineInvitation = async (invitation: any) => {
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

    return {
        invitations,
        isLoading,
        processingInvitations,
        acceptInvitation,
        declineInvitation
    };
}