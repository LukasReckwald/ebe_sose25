import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Text,
  Button,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";

export default function Index() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const mapRef = useRef<MapView>(null);

  // Hole die aktuelle Position beim Start
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("Location permission not granted");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    })();
  }, []);

  // Karte zentrieren
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

  // Wenn Location noch nicht geladen
  if (!location) {
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
            onPress={(event) => {
              const { latitude, longitude } = event.nativeEvent.coordinate;
              setSelectedLocation({ latitude, longitude });
              setModalVisible(true);
            }}
        />

        {/* Marker anzeigen, wenn gesetzt */}
        {selectedLocation && (
            <Marker
                coordinate={selectedLocation}
                image={require("../assets/images/react-logo.png") // Pfad zum benutzerdefinierten Marker-Bild
                }
                anchor={{ x: 0.5, y: 1 }}
            />
        )}

        {/* Button: Karte auf eigene Position zentrieren */}
        <TouchableOpacity style={styles.fab} onPress={centerMap}>
          <Ionicons name="locate" size={28} color="white" />
        </TouchableOpacity>

        {/* Modal zum Speichern */}
        <Modal
            visible={modalVisible}
            transparent={true}
            animationType="slide"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text>Ort speichern?</Text>
              <View style={styles.modalButtons}>
                <Button
                    title="Speichern"
                    onPress={() => {
                      console.log("Gespeichert:", selectedLocation);
                      // Hier kannst du speichern: AsyncStorage, Datenbank, API etc.
                      setModalVisible(false);
                    }}
                />
                <Button
                    title="Abbrechen"
                    onPress={() => {
                      setSelectedLocation(null);
                      setModalVisible(false);
                    }}
                    color="grey"
                />
              </View>
            </View>
          </View>
        </Modal>
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
    alignSelf: "center",
    backgroundColor: "#1E90FF",
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    width: "80%",
    alignItems: "center",
  },
  modalButtons: {
    marginTop: 15,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-around",
  },
});
