import { useEffect, useState } from "react";
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    Alert,
    Image,
    View,
} from "react-native";
import { auth } from "@/firebaseConfig"; // dein Pfad
import { onAuthStateChanged, signOut } from "firebase/auth";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

export default function ProfileScreen() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log("Auth state changed:", user);
            if (!user) {
                router.replace("/login"); // zurück zur Login-Seite
                console.log("❌ Kein User, zurück zur Login-Seite");
            } else {
                setUser(user);
            }
        });

        return unsubscribe; // wichtig: clean-up
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            console.log("✅ Sign-out erfolgreich");
        } catch (error) {
            console.error("❌ Logout error:", error);
            Alert.alert("Fehler", "Logout fehlgeschlagen");
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={["#FDFCFB", "#E2D1C3"]}
                style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.centerBox}>
                <View style={styles.headerContainer}>
                    <Text style={styles.headerText}>Dein Profil</Text>
                    <Text style={styles.subHeaderText}>Verwalte deine Daten und Einstellungen</Text>
                </View>

                {user ? (
                    <View style={styles.profileContainer}>
                        {/* Profilbild */}
                        <Image
                            source={{
                                uri: user.photoURL || "https://www.example.com/default-avatar.png", // Standardbild falls keins vorhanden ist
                            }}
                            style={styles.profileImage}
                        />

                        {/* Benutzername und E-Mail */}
                        <Text style={styles.userName}>{user.displayName || "Benutzer"}</Text>
                        <Text style={styles.email}>{user.email}</Text>

                        {/* Optional können hier weitere Infos angezeigt werden */}
                        <View style={styles.infoContainer}>
                            <Text style={styles.infoText}>Deine Lieblingsplaylist: "Chill Vibes"</Text>
                            <Text style={styles.infoText}>Letzte Aktivität: Vor 1 Stunden</Text>
                        </View>

                        {/* Logout Button */}
                        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                            <Text style={styles.logoutText}>Logout</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <Text style={styles.title}>Lade Profil...</Text>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    centerBox: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        padding: 24,
    },
    headerContainer: {
        marginBottom: 40,
        alignItems: "center",
    },
    headerText: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#1A1A1A",
        marginBottom: 8,
    },
    subHeaderText: {
        fontSize: 16,
        color: "#888",
        textAlign: "center",
        fontStyle: "italic",
    },
    profileContainer: {
        backgroundColor: "#fff",
        padding: 28,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E5E5",
        width: "90%",
        maxWidth: 360,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        alignItems: "center",
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 20,
    },
    userName: {
        fontSize: 22,
        fontWeight: "600",
        color: "#1A1A1A",
        marginBottom: 8,
    },
    email: {
        fontSize: 16,
        color: "#555",
        marginBottom: 24,
        textAlign: "center",
    },
    infoContainer: {
        marginBottom: 24,
        width: "100%",
        paddingHorizontal: 16,
    },
    infoText: {
        fontSize: 14,
        color: "#555",
        marginBottom: 8,
    },
    logoutButton: {
        backgroundColor: "#FF3B30",
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 8,
    },
    logoutText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
});
