import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '@/firebaseConfig';
import {
    startBackgroundLocationTracking,
    stopBackgroundLocationTracking,
    getBackgroundLocationStatus
} from '@/utils/backgroundLocationService';
import { registerForPushNotifications } from '@/utils/notificationService';

interface BackgroundLocationSettingsProps {
    style?: any;
}

export default function BackgroundLocationSettings({ style }: BackgroundLocationSettingsProps) {
    const [isEnabled, setIsEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState({ locationTracking: false, backgroundFetch: false });

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            const currentStatus = await getBackgroundLocationStatus();
            setStatus(currentStatus);
            setIsEnabled(currentStatus.locationTracking && currentStatus.backgroundFetch);
        } catch (error) {
            console.error('Error checking status:', error);
        }
    };

    const handleToggle = async () => {
        if (isLoading) return;

        setIsLoading(true);

        try {
            if (isEnabled) {
                await stopBackgroundLocationTracking();
                setIsEnabled(false);
                Alert.alert('Deaktiviert', 'Background Location Tracking wurde deaktiviert.');
            } else {
                if (!auth.currentUser) {
                    Alert.alert('Fehler', 'Du musst angemeldet sein.');
                    setIsLoading(false);
                    return;
                }

                await registerForPushNotifications();

                const success = await startBackgroundLocationTracking(auth.currentUser.uid);

                if (success) {
                    setIsEnabled(true);
                    Alert.alert(
                        'Aktiviert!',
                        'Background Location Tracking ist jetzt aktiv. Du erhältst Benachrichtigungen wenn Geo-Playlists verfügbar sind.'
                    );
                }
            }

            await checkStatus();
        } catch (error) {
            console.error('Error toggling background location:', error);
            Alert.alert('Fehler', 'Einstellung konnte nicht geändert werden.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={[styles.container, style]}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Ionicons name="location" size={24} color="#3B82F6" />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>Background Geo-Playlists</Text>
                    <Text style={styles.subtitle}>
                        Erhalte Benachrichtigungen wenn du Geo-Playlist Bereiche betrittst
                    </Text>
                </View>
                <Switch
                    value={isEnabled}
                    onValueChange={handleToggle}
                    disabled={isLoading}
                    trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                    thumbColor={isEnabled ? '#3B82F6' : '#9CA3AF'}
                />
            </View>

            <View style={styles.statusContainer}>
                <View style={styles.statusItem}>
                    <Ionicons
                        name={status.locationTracking ? "checkmark-circle" : "close-circle"}
                        size={16}
                        color={status.locationTracking ? "#10B981" : "#DC2626"}
                    />
                    <Text style={styles.statusText}>
                        Location Tracking: {status.locationTracking ? 'Aktiv' : 'Inaktiv'}
                    </Text>
                </View>
                <View style={styles.statusItem}>
                    <Ionicons
                        name={status.backgroundFetch ? "checkmark-circle" : "close-circle"}
                        size={16}
                        color={status.backgroundFetch ? "#10B981" : "#DC2626"}
                    />
                    <Text style={styles.statusText}>
                        Background Updates: {status.backgroundFetch ? 'Aktiv' : 'Inaktiv'}
                    </Text>
                </View>
            </View>

            {isEnabled && (
                <View style={styles.infoBox}>
                    <Ionicons name="information-circle" size={16} color="#3B82F6" />
                    <Text style={styles.infoText}>
                        Die App überwacht deine Position im Hintergrund und sendet Benachrichtigungen
                        wenn Geo-Playlists verfügbar sind.
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginVertical: 8,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EBF8FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    statusContainer: {
        marginTop: 12,
        gap: 6,
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusText: {
        fontSize: 12,
        color: '#6B7280',
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginTop: 12,
        padding: 12,
        backgroundColor: '#EBF8FF',
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#3B82F6',
    },
    infoText: {
        fontSize: 12,
        color: '#1E40AF',
        lineHeight: 16,
        flex: 1,
    },
});
