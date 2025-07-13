import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Keyboard,
    TouchableWithoutFeedback,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import React, { useState } from "react";
import { auth } from "@/firebaseConfig";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
} from "firebase/auth";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    useFocusEffect(
        React.useCallback(() => {
            setEmail("");
            setPassword("");
            setErrorMessage("");
            Keyboard.dismiss();
        }, [])
    );

    const handleAuthError = (error : any) => {
        const code = error.code;

        switch (code) {
            case "auth/invalid-email":
                setErrorMessage("Bitte gib eine gültige E-Mail-Adresse ein.");
                break;
            case "auth/user-not-found":
                setErrorMessage("Kein Benutzer mit dieser E-Mail gefunden.");
                break;
            case "auth/invalid-credential":
                setErrorMessage("E-Mail oder Passwort ist ungültig.");
                break;
            case "auth/email-already-in-use":
                setErrorMessage("Diese E-Mail wird bereits verwendet.");
                break;
            case "auth/weak-password":
                setErrorMessage("Das Passwort muss mindestens 6 Zeichen lang sein.");
                break;
            case "auth/missing-password":
                setErrorMessage("Bitte gib ein Passwort ein.");
                break;
            default:
                setErrorMessage("Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
                console.error("Auth Error:", code);
        }
    };

    const signIn = async () => {
        setErrorMessage("");
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            if (userCredential) {
                router.push("/(tabs)/mapview");
            }
        } catch (error) {
            handleAuthError(error);
        }
    };

    const signUp = async () => {
        setErrorMessage("");
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            if (userCredential) {
                router.push("/(tabs)/mapview");
            }
        } catch (error) {
            handleAuthError(error);
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <SafeAreaView style={styles.container}>
                <LinearGradient
                    colors={["#FDFCFB", "#E2D1C3"]}
                    style={StyleSheet.absoluteFill}
                />

                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={styles.centerBox}
                >
                    <View style={styles.logoContainer}>
                        <Text style={styles.logoText}>Notavi</Text>
                        <Text style={styles.slogan}>
                            Erlebe Orte mit dem passenden Soundtrack
                        </Text>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.heading}>
                            {isRegistering ? "Registrieren" : "Anmelden"}
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="E-Mail"
                            placeholderTextColor="#888"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Passwort"
                            placeholderTextColor="#888"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />

                        {errorMessage ? (
                            <Text style={styles.errorText}>{errorMessage}</Text>
                        ) : null}

                        <TouchableOpacity
                            style={styles.button}
                            onPress={isRegistering ? signUp : signIn}
                        >
                            <Text style={styles.buttonText}>
                                {isRegistering ? "Registrieren" : "Anmelden"}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                                setIsRegistering(!isRegistering);
                                setErrorMessage("");
                            }}
                        >
                            <Text style={styles.link}>
                                {isRegistering
                                    ? "Du hast schon ein Konto? Jetzt anmelden"
                                    : "Noch kein Konto? Jetzt registrieren"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerBox: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    logoContainer: {
        alignItems: "center",
        marginBottom: 40,
    },
    logoText: {
        fontSize: 36,
        fontWeight: "bold",
        color: "#1A1A1A",
        marginBottom: 8,
    },
    slogan: {
        fontSize: 16,
        color: "#1A1A1A",
        textAlign: "center",
        fontStyle: "italic",
    },
    card: {
        width: "90%",
        maxWidth: 360,
        backgroundColor: "#fff",
        padding: 28,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E5E5",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    heading: {
        fontSize: 24,
        fontWeight: "600",
        color: "#1A1A1A",
        marginBottom: 24,
        textAlign: "center",
    },
    input: {
        borderWidth: 1,
        borderColor: "#DDD",
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        fontSize: 16,
        color: "#1A1A1A",
        backgroundColor: "#FDFDFD",
    },
    button: {
        backgroundColor: "#1A1A1A",
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: "center",
        marginBottom: 12,
    },
    buttonText: {
        color: "#FFFFFF",
        fontWeight: "600",
        fontSize: 16,
    },
    link: {
        color: "#555",
        textAlign: "center",
        textDecorationLine: "underline",
        fontSize: 14,
    },
    errorText: {
        color: "#cc0000",
        fontSize: 14,
        marginBottom: 12,
        textAlign: "center",
    },
});
