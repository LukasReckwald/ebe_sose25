import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { registerForPushNotifications, setupNotificationHandlers } from '@/utils/notificationService';

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const [loaded] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    });

    // Initialize notifications when app starts
    useEffect(() => {
        const initializeNotifications = async () => {
            try {
                await registerForPushNotifications();
                const cleanup = setupNotificationHandlers();

                return cleanup;
            } catch (error) {
                console.error('Error initializing notifications:', error);
            }
        };

        const cleanup = initializeNotifications();

        return () => {
            if (cleanup) {
                cleanup.then(cleanupFn => cleanupFn?.());
            }
        };
    }, []);

    if (!loaded) {
        return null;
    }

    return (
        <ThemeProvider value={ DefaultTheme}>
            <Stack>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="spotify-auth" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
        </ThemeProvider>
    );
}