import { useState, useEffect } from 'react';
import { getValidSpotifyTokens, spotifyAPICall } from '@/utils/spotifyToken';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';

export function useSpotifySync(geoPlaylists: any[]) {
    const [currentTrack, setCurrentTrack] = useState<any>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [spotifyPlaylists, setSpotifyPlaylists] = useState<any[]>([]);

    // Current Track Polling
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const data = await spotifyAPICall('/me/player');
                setCurrentTrack(data?.item || null);
                setIsPlaying(data?.is_playing || false);
            } catch (error) {
                setCurrentTrack(null);
                setIsPlaying(false);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // Load Spotify Playlists
    useEffect(() => {
        loadSpotifyPlaylists();
    }, []);

    // Sync Playlist Covers periodically
    useEffect(() => {
        if (geoPlaylists.length > 0) {
            // Prüfe beim Start
            syncPlaylistCovers();

            // Dann alle 30 Minuten
            const interval = setInterval(syncPlaylistCovers, 30 * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, [geoPlaylists]);

    const loadSpotifyPlaylists = async () => {
        try {
            const tokens = await getValidSpotifyTokens();
            if (tokens) {
                const data = await spotifyAPICall('/me/playlists?limit=50');
                setSpotifyPlaylists(data.items);
            }
        } catch (error) {
            console.error('Error loading Spotify playlists:', error);
        }
    };

    const syncPlaylistCovers = async () => {
        try {
            const tokens = await getValidSpotifyTokens();
            if (!tokens) return;

            const db = getFirestore();

            for (const geoPlaylist of geoPlaylists) {
                try {
                    // Hole aktuelle Playlist-Daten von Spotify
                    const spotifyData = await spotifyAPICall(`/playlists/${geoPlaylist.spotifyPlaylistId}`);
                    const newImage = spotifyData.images?.[0]?.url || null;

                    // Update nur wenn sich das Bild geändert hat
                    if (newImage !== geoPlaylist.spotifyPlaylistImage) {
                        await updateDoc(doc(db, 'geoPlaylists', geoPlaylist.id), {
                            spotifyPlaylistImage: newImage,
                            spotifyPlaylistName: spotifyData.name, // Name könnte sich auch geändert haben
                            lastSynced: new Date()
                        });

                        console.log(`Updated cover for ${geoPlaylist.name}`);
                    }
                } catch (error) {
                    console.error(`Error syncing playlist ${geoPlaylist.id}:`, error);
                    // Playlist könnte gelöscht worden sein, aber wir loggen nur den Fehler
                }
            }
        } catch (error) {
            console.error('Error syncing playlist covers:', error);
        }
    };

    const refreshPlaylistCovers = () => {
        syncPlaylistCovers();
        loadSpotifyPlaylists();
    };

    const addCurrentTrackToGeoPlaylist = async (geoPlaylist: any) => {
        if (!currentTrack) return;

        try {
            await spotifyAPICall(`/playlists/${geoPlaylist.spotifyPlaylistId}/tracks`, {
                method: 'POST',
                body: JSON.stringify({ uris: [currentTrack.uri] }),
            });
        } catch (error) {
            console.error('Error adding track:', error);
        }
    };

    return {
        currentTrack,
        isPlaying,
        spotifyPlaylists,
        addCurrentTrackToGeoPlaylist,
        refreshPlaylistCovers,
        syncPlaylistCovers
    };
}