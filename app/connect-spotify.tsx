import React, { useEffect, useState } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { auth } from "@/firebaseConfig";
import { router } from "expo-router";
import * as AuthSession from "expo-auth-session";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// Replace with your Spotify API credentials
const SPOTIFY_CLIENT_ID = "<your-client-id>";
const SPOTIFY_CLIENT_SECRET = "<your-client-secret>";
const REDIRECT_URI = AuthSession.makeRedirectUri({ useProxy: true });
const SCOPES = ["user-read-email", "user-read-private"].join(" ");

export default function ConnectSpotify() {
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // When the component mounts, ensure the user is authenticated
    useEffect(() => {
        if (!auth.currentUser) {
            router.push("/login");
        }
    }, []);

    const handleConnect = async () => {
        setIsLoading(true);
        setErrorMessage("");

        try {
            // Start the Spotify OAuth flow
            const result = await AuthSession.startAsync({
                authUrl: `https://accounts.spotify.com/authorize?` +
                    `response_type=code&` +
                    `client_id=${SPOTIFY_CLIENT_ID}&` +
                    `scope=${encodeURIComponent(SCOPES)}&` +
                    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}`,
            });

            if (result.type !== "success") {
                setErrorMessage("Spotify-Verbindung fehlgeschlagen. Bitte versuche es erneut.");
                setIsLoading(false);
                return;
            }

            const code = result.params.code;

            // Exchange the authorization code for access and refresh tokens
            const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: "Basic " + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`),
                },
                body: `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`,
            });

            const { access_token, refresh_token, expires_in } = await tokenRes.json();

            const expiration = Date.now() + expires_in * 1000;
            const uid = auth.currentUser?.uid;

            if (uid) {
                // Save the Spotify tokens in Firestore
                await setDoc(doc(getFirestore(), "spotifyTokens", uid), {
                    accessToken: access_token,
                    refreshToken: refresh_token,
                    expiration,
                });

                router.push("/(tabs)/mapview");
            }
        } catch (error) {
            setErrorMessage("Es gab ein Problem bei der Verbindung mit Spotify. Bitte versuche es später.");
            console.error("Spotify Auth Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.heading}>Spotify-Verbindung erforderlich</Text>
            <Text style={styles.subtext}>
                Diese App funktioniert nur mit einem verbundenen Spotify-Konto. Bitte verbinde dein Konto, um fortzufahren.
            </Text>
            {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
            <Button
                title={isLoading ? "Verbinde..." : "Mit Spotify verbinden"}
                onPress={handleConnect}
                disabled={isLoading}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        padding: 24,
        backgroundColor: "#fff",
    },
    heading: {
        fontSize: 22,
        fontWeight: "bold",
        marginBottom: 16,
    },
    subtext: {
        fontSize: 16,
        marginBottom: 32,
    },
    errorText: {
        color: "#cc0000",
        fontSize: 14,
        marginBottom: 12,
        textAlign: "center",
    },
});
