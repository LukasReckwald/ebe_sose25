import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
    const colorScheme = useColorScheme();

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
                headerShown: false,
                tabBarButton: HapticTab,
                tabBarBackground: TabBarBackground,
                tabBarStyle: {
                    backgroundColor: Platform.OS === 'android' ? '#1a1a1a' : 'transparent', // Use a solid color on Android
                    position: 'absolute',
                    borderTopWidth: 0,
                    elevation: 0,
                },
            }}
        >
            <Tabs.Screen
                name="playlist"
                options={{
                    title: 'Playlist',
                    tabBarIcon: ({ color }) => (
                        <IconSymbol size={28} name="music.note.list" color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="mapview"
                options={{
                    title: 'Karte',
                    tabBarIcon: ({ color }) => (
                        <IconSymbol size={28} name="map.fill" color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="index"
                options={{
                    title: 'Profil',
                    tabBarIcon: ({ color }) => (
                        <IconSymbol size={28} name="person.fill" color={color} />
                    ),
                }}
            />
        </Tabs>

    );
}
