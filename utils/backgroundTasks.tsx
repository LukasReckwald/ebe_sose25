import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { getValidSpotifyTokens, spotifyAPICall } from './spotifyToken';

const BACKGROUND_LOCATION_TASK = 'background-location';
const GEO_PLAYLIST_CHECK_TASK = 'geo-playlist-check';

// Background Location Task
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
        console.error('Background location error:', error);
        return;
    }

    if (data) {
        const { locations } = data as any;
        const location = locations[0];

        if (location) {
            await checkGeoPlaylistsInBackground({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            });
        }
    }
});

// Background Geo-Playlist Check Task
TaskManager.defineTask(GEO_PLAYLIST_CHECK_TASK, async () => {
    try {
        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced
        });

        await checkGeoPlaylistsInBackground({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
        });

        return { success: true };
    } catch (error) {
        console.error('Background fetch error:', error);
        return { success: false };
    }
});

async function checkGeoPlaylistsInBackground(currentLocation: { latitude: number, longitude: number }) {
    try {
        const userId = await AsyncStorage.getItem('currentUserId');
        if (!userId) return;

        const db = getFirestore();
        const geoPlaylistsRef = collection(db, 'geoPlaylists');
        const q = query(geoPlaylistsRef, where('userId', '==', userId), where('isActive', '==', true));
        const snapshot = await getDocs(q);

        const activeGeoPlaylists: any[] = [];

        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.location) {
                const distance = getDistance(currentLocation, data.location);
                if (distance <= data.radius) {
                    activeGeoPlaylists.push({
                        id: doc.id,
                        ...data
                    });
                }
            }
        });

        const lastActivePlaylistsJson = await AsyncStorage.getItem('lastActiveGeoPlaylists');
        const lastActivePlaylistIds = lastActivePlaylistsJson ? JSON.parse(lastActivePlaylistsJson) : [];

        const newActivePlaylistIds = activeGeoPlaylists.map(p => p.id);
        const newlyActivePlaylistIds = newActivePlaylistIds.filter(id => !lastActivePlaylistIds.includes(id));

        await AsyncStorage.setItem('lastActiveGeoPlaylists', JSON.stringify(newActivePlaylistIds));

        for (const playlist of activeGeoPlaylists) {
            if (newlyActivePlaylistIds.includes(playlist.id)) {
                await handleGeoPlaylistActivation(playlist);
            }
        }

    } catch (error) {
        console.error('Error in background geo-playlist check:', error);
    }
}

async function handleGeoPlaylistActivation(geoPlaylist: any) {
    try {
        const tokens = await getValidSpotifyTokens();
        if (!tokens) {
            await sendGeoPlaylistNotification(geoPlaylist, 'spotify_not_connected');
            return;
        }

        const devices = await spotifyAPICall('/me/player/devices');

        if (devices.devices && devices.devices.length > 0) {
            try {
                await spotifyAPICall('/me/player/play', {
                    method: 'PUT',
                    body: JSON.stringify({
                        context_uri: `spotify:playlist:${geoPlaylist.spotifyPlaylistId}`
                    }),
                });

                await sendGeoPlaylistNotification(geoPlaylist, 'playing');
            } catch (playError) {
                await sendGeoPlaylistNotification(geoPlaylist, 'no_active_device');
            }
        } else {
            await sendGeoPlaylistNotification(geoPlaylist, 'no_device');
        }

    } catch (error) {
        console.error('Error handling geo-playlist activation:', error);
        await sendGeoPlaylistNotification(geoPlaylist, 'error');
    }
}

async function sendGeoPlaylistNotification(geoPlaylist: any, type: string) {
    let title = '';
    let body = '';
    let data: any = {
        type: 'geo_playlist',
        geoPlaylistId: geoPlaylist.id,
        spotifyPlaylistId: geoPlaylist.spotifyPlaylistId,
        spotifyPlaylistName: geoPlaylist.spotifyPlaylistName
    };

    switch (type) {
        case 'playing':
            title = '🎵 Geo-Playlist gestartet!';
            body = `"${geoPlaylist.name}" wird jetzt gespielt`;
            break;
        case 'no_device':
        case 'no_active_device':
            title = '🎵 Geo-Playlist bereit!';
            body = `"${geoPlaylist.name}" wartet auf dich. Tippe um Spotify zu öffnen.`;
            data.action = 'open_spotify';
            break;
        case 'spotify_not_connected':
            title = '🎵 Geo-Playlist verfügbar';
            body = `"${geoPlaylist.name}" ist verfügbar, aber Spotify ist nicht verbunden.`;
            data.action = 'open_app';
            break;
        case 'error':
            title = '🎵 Geo-Playlist';
            body = `"${geoPlaylist.name}" ist verfügbar, aber es gab ein Problem.`;
            data.action = 'open_app';
            break;
    }

    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null,
    });
}

function getDistance(point1: any, point2: any) {
    const R = 6371000;
    const lat1 = point1.latitude * Math.PI / 180;
    const lat2 = point2.latitude * Math.PI / 180;
    const deltaLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const deltaLon = (point2.longitude - point1.longitude) * Math.PI / 180;

    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

export {
    BACKGROUND_LOCATION_TASK,
    GEO_PLAYLIST_CHECK_TASK,
    checkGeoPlaylistsInBackground
};
