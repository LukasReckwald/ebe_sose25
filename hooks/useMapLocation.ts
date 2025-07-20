import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export function useMapLocation() {
    const [location, setLocation] = useState(null);
    const [devMode, setDevMode] = useState(false);
    const [fakeLocation, setFakeLocation] = useState(null);

    useEffect(() => {
        initializeLocation();
    }, []);

    // Location Tracking
    useEffect(() => {
        let watchId: any;

        const startWatching = async () => {
            try {
                watchId = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.Balanced,
                        timeInterval: 5000,
                        distanceInterval: 10,
                    },
                    (loc) => {
                        if (!devMode) {
                            setLocation({
                                latitude: loc.coords.latitude,
                                longitude: loc.coords.longitude,
                            });
                        }
                    }
                );
            } catch (error) {
                console.error('Location watch error:', error);
            }
        };

        startWatching();

        return () => {
            if (watchId) {
                watchId.remove();
            }
        };
    }, [devMode]);

    const initializeLocation = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const loc = await Location.getCurrentPositionAsync({});
        setLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
        });
    };

    const handleDevModeChange = (enabled: boolean) => {
        setDevMode(enabled);
        if (!enabled) {
            setFakeLocation(null);
        }
    };

    return {
        location,
        devMode,
        fakeLocation,
        setDevMode: handleDevModeChange,
        setFakeLocation
    };
}