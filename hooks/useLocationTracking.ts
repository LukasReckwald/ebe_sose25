import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export function useLocationTracking() {
    const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);

    useEffect(() => {
        let watchId: any;

        const startLocationTracking = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;

                const location = await Location.getCurrentPositionAsync({});
                setUserLocation({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                });

                watchId = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.Balanced,
                        timeInterval: 5000,
                        distanceInterval: 10,
                    },
                    (loc) => {
                        setUserLocation({
                            latitude: loc.coords.latitude,
                            longitude: loc.coords.longitude
                        });
                    }
                );
            } catch (error) {
                console.error('Location tracking error:', error);
            }
        };

        startLocationTracking();

        return () => {
            if (watchId) {
                watchId.remove();
            }
        };
    }, []);

    return { userLocation };
}