import React from 'react';
import { View, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MapControlsProps {
    onCenterMap: () => void;
    onShowPlaylists: () => void;
    onCreateNew: () => void;
    devMode: boolean;
    onToggleDevMode: (enabled: boolean) => void;
}

export default function MapControls({
                                        onCenterMap,
                                        onShowPlaylists,
                                        onCreateNew,
                                        devMode,
                                        onToggleDevMode
                                    }: MapControlsProps) {
    const handleDevModeToggle = () => {
        const newDevMode = !devMode;
        onToggleDevMode(newDevMode);

        if (newDevMode) {
            Alert.alert("Dev-Mode aktiviert", "Du kannst jetzt deine Position faken und Debug-Infos sehen!");
        } else {
            Alert.alert("Dev-Mode deaktiviert");
        }
    };

    return (
        <>
            {/* Main Controls */}
            <View style={styles.fabContainer}>
                <TouchableOpacity style={styles.fab} onPress={onCenterMap}>
                    <Ionicons name="locate" size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.fab, styles.fabSecondary]}
                    onPress={onShowPlaylists}
                >
                    <Ionicons name="list" size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.fab, styles.fabPrimary]}
                    onPress={onCreateNew}
                >
                    <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
            </View>

            {/* Dev Mode Toggle */}
            <TouchableOpacity
                style={[styles.fab, styles.fabDevLeft]}
                onPress={handleDevModeToggle}
            >
                <Ionicons
                    name={devMode ? "code" : "code-outline"}
                    size={20}
                    color="white"
                />
            </TouchableOpacity>
        </>
    );
}

const styles = StyleSheet.create({
    fabContainer: {
        position: "absolute",
        bottom: 80,
        right: 20,
        gap: 12,
    },
    fab: {
        backgroundColor: "#1F2937",
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    fabSecondary: {
        backgroundColor: "#6B7280",
    },
    fabPrimary: {
        backgroundColor: "#3B82F6",
    },
    fabDevLeft: {
        position: "absolute",
        bottom: 80,
        left: 20,
        backgroundColor: "#8B5CF6",
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
});