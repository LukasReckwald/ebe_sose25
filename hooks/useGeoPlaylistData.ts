import { useState, useEffect } from 'react';
import { auth } from '@/firebaseConfig';
import { Alert } from 'react-native';
import {
    getFirestore,
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc
} from 'firebase/firestore';

export function useGeoPlaylistData() {
    const [geoPlaylists, setGeoPlaylists] = useState<any[]>([]);
    const [activeGeoPlaylists, setActiveGeoPlaylists] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Firebase Listener für Geo-Playlists
    useEffect(() => {
        if (!auth.currentUser) {
            setIsLoading(false);
            return;
        }

        const userId = auth.currentUser.uid;
        const db = getFirestore();
        const geoPlaylistsRef = collection(db, 'geoPlaylists');

        const q = query(
            geoPlaylistsRef,
            where('userId', '==', userId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const playlists: any[] = [];
            snapshot.forEach((doc) => {
                playlists.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Sortiere nach createdAt
            playlists.sort((a, b) => {
                const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt) || new Date();
                const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt) || new Date();
                return bTime.getTime() - aTime.getTime();
            });

            setGeoPlaylists(playlists);
            setIsLoading(false);
        }, (error) => {
            console.error('Error loading geo-playlists:', error);
            Alert.alert('Fehler', 'Geo-Playlists konnten nicht geladen werden.');
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [auth.currentUser]);

    const toggleGeoPlaylist = async (id: string) => {
        try {
            const db = getFirestore();
            const playlist = geoPlaylists.find(p => p.id === id);
            if (!playlist) return;

            const docRef = doc(db, 'geoPlaylists', id);
            await updateDoc(docRef, {
                isActive: !playlist.isActive
            });
        } catch (error) {
            console.error('Error toggling geo-playlist:', error);
            Alert.alert("Fehler", "Status konnte nicht geändert werden.");
        }
    };

    const deleteGeoPlaylist = async (id: string) => {
        Alert.alert(
            "Löschen bestätigen",
            "Möchtest du diese Geo-Playlist wirklich löschen?",
            [
                { text: "Abbrechen", style: "cancel" },
                {
                    text: "Löschen",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const db = getFirestore();
                            await deleteDoc(doc(db, 'geoPlaylists', id));
                        } catch (error) {
                            console.error('Error deleting geo-playlist:', error);
                            Alert.alert("Fehler", "Geo-Playlist konnte nicht gelöscht werden.");
                        }
                    }
                }
            ]
        );
    };

    return {
        geoPlaylists,
        activeGeoPlaylists,
        isLoading,
        toggleGeoPlaylist,
        deleteGeoPlaylist,
        setActiveGeoPlaylists
    };
}