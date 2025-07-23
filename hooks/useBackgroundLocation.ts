import { useState, useEffect } from 'react';
import { AppState } from 'react-native';
import { auth } from '@/firebaseConfig';
import { startBackgroundLocationTracking, getBackgroundLocationStatus } from '@/utils/backgroundLocationService';
import { setupNotificationHandlers } from '@/utils/notificationService';

export function useBackgroundLocation() {
    const [isBackgroundEnabled, setIsBackgroundEnabled] = useState(false);
    const [notificationHandlers, setNotificationHandlers] = useState<(() => void) | null>(null);

    useEffect(() => {
        const cleanup = setupNotificationHandlers();
        setNotificationHandlers(() => cleanup);

        checkBackgroundStatus();

        const handleAppStateChange = (nextAppState: string) => {
            if (nextAppState === 'active') {
                checkBackgroundStatus();
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription?.remove();
            if (notificationHandlers) {
                notificationHandlers();
            }
        };
    }, []);

    const checkBackgroundStatus = async () => {
        try {
            const status = await getBackgroundLocationStatus();
            setIsBackgroundEnabled(status.locationTracking && status.backgroundFetch);
        } catch (error) {
            console.error('Error checking background status:', error);
            setIsBackgroundEnabled(false);
        }
    };

    const enableBackgroundLocation = async () => {
        if (!auth.currentUser) return false;

        try {
            const success = await startBackgroundLocationTracking(auth.currentUser.uid);
            if (success) {
                setIsBackgroundEnabled(true);
            }
            return success;
        } catch (error) {
            console.error('Error enabling background location:', error);
            return false;
        }
    };

    return {
        isBackgroundEnabled,
        enableBackgroundLocation,
        checkBackgroundStatus
    };
}