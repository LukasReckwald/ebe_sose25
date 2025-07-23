import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

interface PermissionStatus {
    location: string;
    backgroundLocation: string;
    notifications: string;
}

export function PermissionManager() {
    const [permissions, setPermissions] = useState<PermissionStatus>({
        location: 'unknown',
        backgroundLocation: 'unknown',
        notifications: 'unknown'
    });

    useEffect(() => {
        checkAllPermissions();
    }, []);

    const checkAllPermissions = async () => {
        try {
            const { status: locationStatus } = await Location.getForegroundPermissionsAsync();
            const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
            const { status: notificationStatus } = await Notifications.getPermissionsAsync();

            setPermissions({
                location: locationStatus,
                backgroundLocation: backgroundStatus,
                notifications: notificationStatus
            });
        } catch (error) {
            console.error('Error checking permissions:', error);
        }
    };

    const requestLocationPermission = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                Alert.alert('Berechtigung erteilt', 'Standort-Berechtigung wurde erteilt.');
            } else {
                Alert.alert('Berechtigung verweigert', 'Standort-Berechtigung ist erforderlich für Geo-Playlists.');
            }
            checkAllPermissions();
        } catch (error) {
            console.error('Error requesting location permission:', error);
        }
    };

    const requestBackgroundLocationPermission = async () => {
        try {
            const { status } = await Location.requestBackgroundPermissionsAsync();
            if (status === 'granted') {
                Alert.alert('Berechtigung erteilt', 'Hintergrund-Standort wurde aktiviert.');
            } else {
                Alert.alert(
                    'Berechtigung erforderlich',
                    'Für Background Geo-Playlists wird Hintergrund-Standort benötigt.',
                    [
                        { text: 'Abbrechen', style: 'cancel' },
                        { text: 'Einstellungen öffnen', onPress: () => Linking.openSettings() }
                    ]
                );
            }
            checkAllPermissions();
        } catch (error) {
            console.error('Error requesting background location permission:', error);
        }
    };

    const requestNotificationPermission = async () => {
        try {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status === 'granted') {
                Alert.alert('Berechtigung erteilt', 'Benachrichtigungen wurden aktiviert.');
            } else {
                Alert.alert('Berechtigung verweigert', 'Benachrichtigungen sind erforderlich für Geo-Playlist Alerts.');
            }
            checkAllPermissions();
        } catch (error) {
            console.error('Error requesting notification permission:', error);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'granted':
                return <Ionicons name="checkmark-circle" size={20} color="#10B981" />;
            case 'denied':
                return <Ionicons name="close-circle" size={20} color="#DC2626" />;
            default:
                return <Ionicons name="help-circle" size={20} color="#F59E0B" />;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'granted':
                return 'Erteilt';
            case 'denied':
                return 'Verweigert';
            default:
                return 'Unbekannt';
        }
    };

    return (
        <View style={permissionStyles.container}>
            <Text style={permissionStyles.title}>App-Berechtigungen</Text>

            <View style={permissionStyles.permissionItem}>
                <View style={permissionStyles.permissionInfo}>
                    {getStatusIcon(permissions.location)}
                    <Text style={permissionStyles.permissionText}>
                        Standort: {getStatusText(permissions.location)}
                    </Text>
                </View>
                {permissions.location !== 'granted' && (
                    <TouchableOpacity
                        style={permissionStyles.requestButton}
                        onPress={requestLocationPermission}
                    >
                        <Text style={permissionStyles.requestButtonText}>Anfordern</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={permissionStyles.permissionItem}>
                <View style={permissionStyles.permissionInfo}>
                    {getStatusIcon(permissions.backgroundLocation)}
                    <Text style={permissionStyles.permissionText}>
                        Hintergrund-Standort: {getStatusText(permissions.backgroundLocation)}
                    </Text>
                </View>
                {permissions.backgroundLocation !== 'granted' && (
                    <TouchableOpacity
                        style={permissionStyles.requestButton}
                        onPress={requestBackgroundLocationPermission}
                    >
                        <Text style={permissionStyles.requestButtonText}>Anfordern</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={permissionStyles.permissionItem}>
                <View style={permissionStyles.permissionInfo}>
                    {getStatusIcon(permissions.notifications)}
                    <Text style={permissionStyles.permissionText}>
                        Benachrichtigungen: {getStatusText(permissions.notifications)}
                    </Text>
                </View>
                {permissions.notifications !== 'granted' && (
                    <TouchableOpacity
                        style={permissionStyles.requestButton}
                        onPress={requestNotificationPermission}
                    >
                        <Text style={permissionStyles.requestButtonText}>Anfordern</Text>
                    </TouchableOpacity>
                )}
            </View>

            <TouchableOpacity style={permissionStyles.refreshButton} onPress={checkAllPermissions}>
                <Ionicons name="refresh" size={16} color="#3B82F6" />
                <Text style={permissionStyles.refreshButtonText}>Status aktualisieren</Text>
            </TouchableOpacity>
        </View>
    );
}

const permissionStyles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 16,
    },
    permissionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    permissionInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    permissionText: {
        fontSize: 14,
        color: '#4B5563',
        fontWeight: '500',
    },
    requestButton: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    requestButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 16,
        padding: 12,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
    },
    refreshButtonText: {
        fontSize: 14,
        color: '#3B82F6',
        fontWeight: '500',
    },
});
