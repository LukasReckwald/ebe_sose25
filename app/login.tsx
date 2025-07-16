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
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState } from "react";
import { auth } from "@/firebaseConfig";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
} from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from '@expo/vector-icons';

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const firestore = getFirestore();

    useFocusEffect(
        React.useCallback(() => {
            setEmail("");
            setPassword("");
            setErrorMessage("");
            setIsLoading(false);
            Keyboard.dismiss();
        }, [])
    );

    const handleAuthError = (error: any) => {
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
        setIsLoading(true);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const userDoc = await getDoc(doc(firestore, "spotifyTokens", userCredential.user.uid));

            if (userDoc.exists()) {
                router.push("/(tabs)/mapview");
            } else {
                router.push("/connect-spotify");
            }
        } catch (error) {
            handleAuthError(error);
        } finally {
            setIsLoading(false);
        }
    };

    const signUp = async () => {
        setErrorMessage("");
        setIsLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            if (userCredential) {
                router.push("/(tabs)/mapview");
            }
        } catch (error) {
            handleAuthError(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <SafeAreaView style={styles.container}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.content}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.logoContainer}>
                            <View style={styles.logoIcon}>
                                <Ionicons name="musical-notes" size={32} color="#3B82F6" />
                            </View>
                            <Text style={styles.logoText}>Notavi</Text>
                            <Text style={styles.slogan}>
                                Erlebe Orte mit dem passenden Soundtrack
                            </Text>
                        </View>
                    </View>

                    {/* Scrollable Content */}
                    <View style={styles.scrollContainer}>
                        <View style={styles.mainContent}>
                            <View style={styles.authCard}>
                                <View style={styles.authHeader}>
                                    <Text style={styles.authTitle}>
                                        {isRegistering ? "Registrieren" : "Anmelden"}
                                    </Text>
                                    <Text style={styles.authSubtitle}>
                                        {isRegistering
                                            ? "Erstelle dein Konto für personalisierte Musik-Erlebnisse"
                                            : "Willkommen zurück! Melde dich an um fortzufahren"
                                        }
                                    </Text>
                                </View>

                                {/* Input Section */}
                                <View style={styles.inputSection}>
                                    <View style={styles.inputContainer}>
                                        <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="E-Mail-Adresse"
                                            placeholderTextColor="#9CA3AF"
                                            value={email}
                                            onChangeText={setEmail}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            editable={!isLoading}
                                        />
                                    </View>

                                    <View style={styles.inputContainer}>
                                        <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Passwort"
                                            placeholderTextColor="#9CA3AF"
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry
                                            editable={!isLoading}
                                        />
                                    </View>

                                    {errorMessage ? (
                                        <View style={styles.errorContainer}>
                                            <Ionicons name="alert-circle" size={16} color="#DC2626" />
                                            <Text style={styles.errorText}>{errorMessage}</Text>
                                        </View>
                                    ) : null}
                                </View>

                                {/* Action Buttons */}
                                <View style={styles.actionSection}>
                                    <TouchableOpacity
                                        style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                                        onPress={isRegistering ? signUp : signIn}
                                        disabled={isLoading || !email.trim() || !password.trim()}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator size="small" color="white" />
                                        ) : (
                                            <>
                                                <Ionicons
                                                    name={isRegistering ? "person-add" : "log-in"}
                                                    size={18}
                                                    color="white"
                                                />
                                                <Text style={styles.primaryButtonText}>
                                                    {isRegistering ? "Registrieren" : "Anmelden"}
                                                </Text>
                                            </>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.secondaryButton}
                                        onPress={() => {
                                            setIsRegistering(!isRegistering);
                                            setErrorMessage("");
                                        }}
                                        disabled={isLoading}
                                    >
                                        <Text style={styles.secondaryButtonText}>
                                            {isRegistering
                                                ? "Du hast schon ein Konto? Jetzt anmelden"
                                                : "Noch kein Konto? Jetzt registrieren"}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Features Preview */}
                            <View style={styles.featuresSection}>
                                <Text style={styles.featuresTitle}>Was dich erwartet:</Text>
                                <View style={styles.featuresList}>
                                    <View style={styles.featureItem}>
                                        <Ionicons name="location" size={16} color="#10B981" />
                                        <Text style={styles.featureText}>Standort-basierte Playlisten</Text>
                                    </View>
                                    <View style={styles.featureItem}>
                                        <Ionicons name="musical-notes" size={16} color="#3B82F6" />
                                        <Text style={styles.featureText}>Spotify-Integration</Text>
                                    </View>
                                    <View style={styles.featureItem}>
                                        <Ionicons name="play-circle" size={16} color="#8B5CF6" />
                                        <Text style={styles.featureText}>Automatisches Abspielen</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Bottom Spacing */}
                            <View style={styles.bottomSpacing} />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    // Container & Layout
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    content: {
        flex: 1,
    },
    scrollContainer: {
        flex: 1,
    },

    // Header - Kompakter
    header: {
        paddingTop: 20,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    logoContainer: {
        alignItems: 'center',
    },
    logoIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#EBF8FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    logoText: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 6,
    },
    slogan: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        fontStyle: 'italic',
        lineHeight: 18,
    },

    // Main Content
    mainContent: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
    },

    // Auth Card
    authCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 24,
        marginBottom: 24,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
    },
    authHeader: {
        marginBottom: 24,
        alignItems: 'center',
    },
    authTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 8,
    },
    authSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
    },

    // Input Section
    inputSection: {
        marginBottom: 24,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 16,
        height: 48,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
        height: '100%',
    },

    // Error
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        gap: 8,
    },
    errorText: {
        color: '#DC2626',
        fontSize: 14,
        flex: 1,
    },

    // Action Section
    actionSection: {
        gap: 12,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3B82F6',
        paddingVertical: 14,
        borderRadius: 8,
        gap: 8,
        elevation: 3,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    buttonDisabled: {
        backgroundColor: '#9CA3AF',
        elevation: 0,
        shadowOpacity: 0,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#6B7280',
        fontSize: 14,
        textAlign: 'center',
    },

    // Features Section - Kompakter
    featuresSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    featuresTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 12,
        textAlign: 'center',
    },
    featuresList: {
        gap: 10,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    featureText: {
        fontSize: 13,
        color: '#4B5563',
        fontWeight: '500',
    },

    // Bottom Spacing
    bottomSpacing: {
        height: 40,
    },
});