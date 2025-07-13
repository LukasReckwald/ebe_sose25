import React, { useEffect, useState, useRef } from "react";
import {
    StyleSheet,
    View,
    ActivityIndicator,
    TouchableOpacity,
    Text,
    Alert,
} from "react-native";
import MapView, { Marker, Circle } from "react-native-maps";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import {SafeAreaView} from "react-native-safe-area-context";

const GEOFENCE_TASK = "GEOFENCE_TASK";

export default function Mapview() {
    const [location, setLocation] = useState(null);
    const [marker, setMarker] = useState(null);
    const [radius, setRadius] = useState(100);
    const [isInZone, setIsInZone] = useState(false);
    const [distance, setDistance] = useState(null);
    const [isTracking, setIsTracking] = useState(false);
    const [devMode, setDevMode] = useState(false);
    const [fakeLocation, setFakeLocation] = useState(null);
    const [mapMode, setMapMode] = useState("geofence"); // "geofence" oder "fake-position"
    const mapRef = useRef(null);

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Fehler", "Standortberechtigung nicht erteilt");
                return;
            }

            const loc = await Location.getCurrentPositionAsync({});
            setLocation({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
            });

            const saved = await AsyncStorage.getItem("geo");
            if (saved) {
                const { marker: m, radius: r } = JSON.parse(saved);
                setMarker(m);
                setRadius(r);
                setIsTracking(true);
                await startGeofenceTask();
            }
        })();
    }, []);

    // Live-Tracking der Position
    useEffect(() => {
        if (!marker || !isTracking) return;

        const interval = setInterval(async () => {
            let currentPos;

            if (devMode && fakeLocation) {
                // Verwende Fake-Position im Dev-Mode
                currentPos = fakeLocation;
            } else {
                // Verwende echte Position
                const loc = await Location.getCurrentPositionAsync({});
                currentPos = loc.coords;
            }

            const dist = getDistance(currentPos, marker);
            setDistance(dist);

            const wasInZone = isInZone;
            const nowInZone = dist <= radius;
            setIsInZone(nowInZone);

            // Wenn gerade in Zone gekommen
            if (!wasInZone && nowInZone) {
                Alert.alert("🎯 Geofence erreicht!", `Du bist im Zielbereich! (${dist.toFixed(0)}m)`);
            }
        }, 2000); // Alle 2 Sekunden checken

        return () => clearInterval(interval);
    }, [marker, radius, isTracking, isInZone, devMode, fakeLocation]);

    const saveGeofence = async () => {
        if (!marker) return;

        await AsyncStorage.setItem("geo", JSON.stringify({ marker, radius }));
        setIsTracking(true);
        await startGeofenceTask();

        // Sofort-Check
        let currentPos;
        if (devMode && fakeLocation) {
            currentPos = fakeLocation;
        } else {
            const loc = await Location.getCurrentPositionAsync({});
            currentPos = loc.coords;
        }

        const dist = getDistance(currentPos, marker);
        setDistance(dist);

        if (dist <= radius) {
            setIsInZone(true);
            Alert.alert("Geofence", "Du bist bereits im Zielbereich!");
        } else {
            setIsInZone(false);
            Alert.alert("Gespeichert", `Geofence aktiviert! Entfernung: ${dist.toFixed(0)}m`);
        }
    };

    const stopGeofence = async () => {
        setIsTracking(false);
        setIsInZone(false);
        setDistance(null);
        await Location.stopLocationUpdatesAsync(GEOFENCE_TASK);
        await AsyncStorage.removeItem("geo");
        setMarker(null);
        Alert.alert("Gestoppt", "Geofence deaktiviert");
    };

    const startGeofenceTask = async () => {
        try {
            const hasStarted = await Location.hasStartedLocationUpdatesAsync(GEOFENCE_TASK);
            if (!hasStarted) {
                await Location.startLocationUpdatesAsync(GEOFENCE_TASK, {
                    accuracy: Location.Accuracy.High,
                    distanceInterval: 5,
                    deferredUpdatesInterval: 1000,
                });
            }
        } catch (error) {
            console.error("Fehler beim Starten der Geofence:", error);
        }
    };

    const centerMap = () => {
        if (location && mapRef.current) {
            mapRef.current.animateToRegion({
                ...location,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });
        }
    };

    // Distanzberechnung
    const getDistance = (point1, point2) => {
        const R = 6371000;
        const lat1 = point1.latitude * Math.PI / 180;
        const lat2 = point2.latitude * Math.PI / 180;
        const deltaLat = (point2.latitude - point1.latitude) * Math.PI / 180;
        const deltaLon = (point2.longitude - point1.longitude) * Math.PI / 180;

        const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    };

    if (!location) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                showsUserLocation={!devMode} // Verstecke echte Position im Dev-Mode
                initialRegion={{ ...location, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
                onPress={(e) => {
                    if (mapMode === "geofence") {
                        setMarker(e.nativeEvent.coordinate);
                    } else if (mapMode === "fake-position") {
                        setFakeLocation(e.nativeEvent.coordinate);
                        setMapMode("geofence"); // Zurück zum normalen Modus
                        Alert.alert("Fake Position gesetzt!", `Lat: ${e.nativeEvent.coordinate.latitude.toFixed(5)}, Lng: ${e.nativeEvent.coordinate.longitude.toFixed(5)}`);
                    }
                }}
            >
                {marker && (
                    <>
                        <Marker coordinate={marker} title="Geofence Ziel" />
                        <Circle
                            center={marker}
                            radius={radius}
                            strokeColor={isInZone ? "rgba(34,197,94,0.8)" : "rgba(30,144,255,0.8)"}
                            fillColor={isInZone ? "rgba(34,197,94,0.2)" : "rgba(30,144,255,0.2)"}
                        />
                    </>
                )}

                {/* Fake-Position im Dev-Mode */}
                {devMode && fakeLocation && (
                    <Marker
                        coordinate={fakeLocation}
                        title="Fake Position"
                        pinColor="lightblue"
                        identifier="fake-location"
                    />
                )}
            </MapView>

            {/* Dev-Mode Controls */}
            {devMode && (
                <View style={styles.devModeContainer}>
                    <Text style={styles.devModeTitle}>🛠️ Dev-Mode</Text>
                    <Text style={styles.devModeSubtitle}>
                        Modus: {mapMode === "geofence" ? "Geofence setzen" : "Fake-Position setzen"}
                    </Text>

                    <TouchableOpacity
                        style={[styles.devButton, mapMode === "fake-position" && styles.devButtonActive]}
                        onPress={() => {
                            if (mapMode === "fake-position") {
                                setMapMode("geofence");
                            } else {
                                setMapMode("fake-position");
                                Alert.alert("Fake Position Modus", "Tippe jetzt auf die Karte um deine Position zu setzen");
                            }
                        }}
                    >
                        <Text style={styles.devButtonText}>
                            {mapMode === "fake-position" ? "Abbrechen" : "Fake Position setzen"}
                        </Text>
                    </TouchableOpacity>

                    {fakeLocation && (
                        <TouchableOpacity
                            style={[styles.devButton, styles.devButtonSecondary]}
                            onPress={() => {
                                setFakeLocation(null);
                                setMapMode("geofence");
                                Alert.alert("Fake Position gelöscht", "Zurück zur echten Position");
                            }}
                        >
                            <Text style={styles.devButtonText}>Fake Position löschen</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Live-Status Banner */}
            {isTracking && (
                <View style={[styles.statusBanner, { backgroundColor: isInZone ? "#22c55e" : "#1E90FF" }]}>
                    <Text style={styles.statusText}>
                        {isInZone ? "🎯 IM ZIELBEREICH!" : "📍 Tracking aktiv"}
                    </Text>
                    {distance && (
                        <Text style={styles.distanceText}>
                            Entfernung: {distance.toFixed(0)}m
                        </Text>
                    )}
                </View>
            )}

            {marker && (
                <View style={styles.sliderContainer}>
                    <Text style={styles.sliderLabel}>Radius: {radius.toFixed(0)} m</Text>
                    <Slider
                        minimumValue={10}
                        maximumValue={1000}
                        step={10}
                        value={radius}
                        onValueChange={setRadius}
                        minimumTrackTintColor="#1E90FF"
                        maximumTrackTintColor="#ccc"
                        thumbTintColor="#1E90FF"
                    />
                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.saveButton} onPress={saveGeofence}>
                            <Text style={styles.saveText}>
                                {isTracking ? "Aktualisieren" : "Geofence starten"}
                            </Text>
                        </TouchableOpacity>
                        {isTracking && (
                            <TouchableOpacity style={styles.stopButton} onPress={stopGeofence}>
                                <Text style={styles.stopText}>Stoppen</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}

            <TouchableOpacity style={styles.fab} onPress={centerMap}>
                <Ionicons name="locate" size={28} color="white" />
            </TouchableOpacity>

            {/* Dev-Mode Toggle */}
            <TouchableOpacity
                style={styles.devToggle}
                onPress={() => {
                    setDevMode(!devMode);
                    if (!devMode) {
                        Alert.alert("Dev-Mode aktiviert", "Du kannst jetzt deine Position faken!");
                    } else {
                        setFakeLocation(null);
                        Alert.alert("Dev-Mode deaktiviert", "Zurück zur echten Position");
                    }
                }}
            >
                <Ionicons name={devMode ? "code" : "code-outline"} size={24} color="white" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

// Vereinfachter Background Task
TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
    if (error) {
        console.error("Geofence Task Error:", error);
        return;
    }

    const { locations } = data;
    const currentLocation = locations?.[0]?.coords;
    if (!currentLocation) return;

    console.log("Background Position Update:", currentLocation);
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB", // Heller, sanfter Hintergrund
    },
    center: {
        justifyContent: "center",
        alignItems: "center",
    },
    map: {
        flex: 1,
    },
    fab: {
        position: "absolute",
        bottom: 100,
        alignSelf: "center",
        backgroundColor: "#3B82F6", // Blau für den FAB
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    statusBanner: {
        position: "absolute",
        top: 50,
        left: 20,
        right: 20,
        padding: 15,
        borderRadius: 12,
        alignItems: "center",
        elevation: 5,
        backgroundColor: "#34D399", // Grüner Status für "In Zone"
    },
    statusText: {
        color: "white",
        fontSize: 18,
        fontWeight: "bold",
    },
    distanceText: {
        color: "white",
        fontSize: 14,
        marginTop: 5,
    },
    devModeContainer: {
        position: "absolute",
        top: 140,
        right: 20,
        backgroundColor: "#4B5563", // Dunkler Hintergrund für Dev-Mode
        padding: 12,
        borderRadius: 8,
        minWidth: 160,
        elevation: 5,
    },
    devModeTitle: {
        color: "white",
        fontSize: 14,
        fontWeight: "bold",
        marginBottom: 8,
        textAlign: "center",
    },
    devButton: {
        backgroundColor: "rgba(255,255,255,0.2)",
        padding: 10,
        borderRadius: 8,
        marginBottom: 8,
        alignItems: "center",
    },
    devButtonSecondary: {
        backgroundColor: "rgba(255,255,255,0.1)",
    },
    devButtonText: {
        color: "white",
        fontSize: 14,
        fontWeight: "500",
        textAlign: "center",
    },
    devToggle: {
        position: "absolute",
        bottom: 100,
        right: 20,
        backgroundColor: "#4B5563", // Dunkel für Toggle Button
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: "center",
        justifyContent: "center",
    },
    sliderContainer: {
        position: "absolute",
        bottom: 180,
        left: 20,
        right: 20,
        backgroundColor: "#FFFFFF", // Heller Hintergrund für den Slider
        padding: 15,
        borderRadius: 12,
        elevation: 5,
    },
    sliderLabel: {
        marginBottom: 10,
        fontSize: 16,
        fontWeight: "500",
        color: "#4B5563", // Graue Schrift für den Label
    },
    buttonRow: {
        flexDirection: "row",
        marginTop: 10,
        gap: 10,
    },
    saveButton: {
        flex: 1,
        backgroundColor: "#3B82F6", // Blau für die Speichern-Schaltfläche
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    stopButton: {
        flex: 1,
        backgroundColor: "#DC2626", // Rote Farbe für Stoppen
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    saveText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600", // Etwas stärkere Schrift für den Button Text
    },
    stopText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
});
