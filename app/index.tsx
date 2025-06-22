import React, { useEffect, useState, useRef } from "react";
import { StyleSheet, View, TouchableOpacity, ActivityIndicator } from "react-native";
import MapView from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import type { LocationObjectCoords } from "expo-location";

export default function Index() {
  const [location, setLocation] = useState<LocationObjectCoords | null>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("Location permission not granted");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    })();
  }, []);

  const centerMap = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  if (!location) {
    // Ladeanzeige während Location ermittelt wird
    return (
        <View style={[styles.container, styles.center]}>
          <ActivityIndicator size="large" color="#1E90FF" />
        </View>
    );
  }

  return (
      <View style={styles.container}>
        <MapView
            ref={mapRef}
            style={styles.map}
            showsUserLocation={true}
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
        />

        {/* Floating + Button */}
        <TouchableOpacity style={styles.fab} onPress={centerMap}>
          <Ionicons name="locate" size={28} color="white" />
        </TouchableOpacity>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  fab: {
    position: "absolute",
    bottom: 40,
    right: 20,
    backgroundColor: "#1E90FF",
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
});
