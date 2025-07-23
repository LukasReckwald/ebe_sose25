import { getFirestore, doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { spotifyAPICall } from '@/utils/spotifyToken';

// Utility-Funktion um Playlist-Images zu aktualisieren
export const updatePlaylistImages = async (userId: string) => {
    try {
        const db = getFirestore();

        // Alle Geo-Playlists des Users laden
        const geoPlaylistsRef = collection(db, 'geoPlaylists');
        const q = query(geoPlaylistsRef, where('userId', '==', userId));
        const querySnapshot = await getDocs(q);

        const updatePromises = querySnapshot.docs.map(async (docSnapshot) => {
            const geoPlaylist = docSnapshot.data();
            const spotifyPlaylistId = geoPlaylist.spotifyPlaylistId;

            try {
                // Aktuelle Playlist-Daten von Spotify abrufen
                const spotifyPlaylist = await spotifyAPICall(`/playlists/${spotifyPlaylistId}`);

                // Nur aktualisieren wenn sich das Image geändert hat
                const currentImage = geoPlaylist.spotifyPlaylistImage;
                const newImage = spotifyPlaylist.images?.[0]?.url ?? null;

                if (currentImage !== newImage) {
                    await updateDoc(doc(db, 'geoPlaylists', docSnapshot.id), {
                        spotifyPlaylistImage: newImage,
                        spotifyPlaylistName: spotifyPlaylist.name, // Name könnte sich auch geändert haben
                        lastUpdated: new Date()
                    });

                    console.log(`Updated image for playlist: ${geoPlaylist.name}`);
                }
            } catch (error) {
                console.error(`Error updating playlist ${geoPlaylist.name}:`, error);
            }
        });

        await Promise.all(updatePromises);
        return true;
    } catch (error) {
        console.error('Error updating playlist images:', error);
        return false;
    }
};
