import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { BACKGROUND_LOCATION_TASK, GEO_PLAYLIST_CHECK_TASK } from './backgroundTasks';

export async function startBackgroundLocationTracking(userId: string) {
    try {
        await AsyncStorage.setItem('currentUserId', userId);

        const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
        if (foregroundStatus !== 'granted') {
            Alert.alert('Berechtigung erforderlich', 'Standort-Berechtigung ist erforderlich für Geo-Playlists.');
            return false;
        }

        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
            Alert.alert(
                'Hintergrund-Standort erforderlich',
                'Um Geo-Playlists automatisch im Hintergrund zu starten, benötigen wir Berechtigung für Hintergrund-Standort.',
                [
                    { text: 'Später', style: 'cancel' },
                    { text: 'Einstellungen öffnen', onPress: () => Location.enableNetworkProviderAsync() }
                ]
            );
            return false;
        }

        const isLocationTaskRunning = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
        if (!isLocationTaskRunning) {
            await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
                accuracy: Location.Accuracy.Balanced,
                timeInterval: 30000,
                distanceInterval: 20,
                deferredUpdatesInterval: 60000,
                foregroundService: {
                    notificationTitle: 'Notavi läuft im Hintergrund',
                    notificationBody: 'Überwacht Geo-Playlists in deiner Nähe',
                    notificationColor: '#3B82F6',
                },
            });
        }

        await BackgroundFetch.registerTaskAsync(GEO_PLAYLIST_CHECK_TASK, {
            minimumInterval: 60,
            stopOnTerminate: false,
            startOnBoot: true,
        });

        return true;
    } catch (error) {
        console.error('Error starting background location tracking:', error);
        Alert.alert('Fehler', 'Background Location Tracking konnte nicht gestartet werden.');
        return false;
    }
}

export async function stopBackgroundLocationTracking() {
    try {
        const isLocationTaskRunning = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
        if (isLocationTaskRunning) {
            await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        }

        const isFetchTaskRegistered = await TaskManager.isTaskRegisteredAsync(GEO_PLAYLIST_CHECK_TASK);
        if (isFetchTaskRegistered) {
            await BackgroundFetch.unregisterTaskAsync(GEO_PLAYLIST_CHECK_TASK);
        }

        await AsyncStorage.removeItem('currentUserId');
        await AsyncStorage.removeItem('lastActiveGeoPlaylists');
    } catch (error) {
        console.error('Error stopping background location tracking:', error);
    }
}

export async function getBackgroundLocationStatus() {
    try {
        const isLocationTaskRunning = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
        const isFetchTaskRegistered = await TaskManager.isTaskRegisteredAsync(GEO_PLAYLIST_CHECK_TASK);

        return {
            locationTracking: isLocationTaskRunning,
            backgroundFetch: isFetchTaskRegistered
        };
    } catch (error) {
        console.error('Error checking background location status:', error);
        return {
            locationTracking: false,
            backgroundFetch: false
        };
    }
}