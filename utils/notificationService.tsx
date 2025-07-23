import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ KORRIGIERT: Verwende die neuen Property-Namen
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export async function registerForPushNotifications() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('geo-playlists', {
            name: 'Geo-Playlists',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#3B82F6',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Push notification permission denied');
            return;
        }

        try {
            token = (await Notifications.getExpoPushTokenAsync({
                projectId: '15210a9a-cbdd-4bd3-9fd1-b1db9d2c39b3'
            })).data;
            await AsyncStorage.setItem('expoPushToken', token);
        } catch (error) {
            console.error('Error getting push token:', error);
        }
    } else {
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}

export function setupNotificationHandlers() {
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
        console.log('✅ Notification received in foreground:', notification.request.content.title);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;

        if (data && typeof data === 'object' && 'type' in data && data.type === 'geo_playlist') {
            handleGeoPlaylistNotificationResponse(data);
        }
    });

    return () => {
        foregroundSubscription.remove();
        responseSubscription.remove();
    };
}

async function handleGeoPlaylistNotificationResponse(data: any) {
    console.log('🎵 Handling geo-playlist notification:', data.spotifyPlaylistName);

    if (data.action === 'open_spotify') {
        const spotifyUrl = `spotify:playlist:${data.spotifyPlaylistId}`;
        const webUrl = `https://open.spotify.com/playlist/${data.spotifyPlaylistId}`;

        try {
            const supported = await Linking.canOpenURL(spotifyUrl);
            if (supported) {
                console.log('🎵 Opening Spotify app with playlist');
                await Linking.openURL(spotifyUrl);
            } else {
                console.log('🎵 Opening Spotify web with playlist');
                await Linking.openURL(webUrl);
            }
        } catch (error) {
            console.error('Error opening Spotify:', error);
        }
    } else if (data.action === 'open_app') {
        console.log('📱 Opening app for geo-playlist:', data.geoPlaylistId);
    }
}