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
import React, { useState, useEffect } from "react";
import { auth } from "@/firebaseConfig";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    User
} from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { createOrUpdateUserProfile } from '@/utils/userManagement';
import { startBackgroundLocationTracking } from '@/utils/backgroundLocationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    const firestore = getFirestore();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                await handleUserLogin(user);
            } else {
                setIsCheckingAuth(false);
            }
        });

        return unsubscribe;
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            if (!auth.currentUser) {
                setEmail("");
                setPassword("");
                setErrorMessage("");
                setIsLoading(false);
                Keyboard.dismiss();
            }
        }, [])
    );

    const handleUserLogin = async (user: User) => {
        try {
            setIsLoading(true);

            await AsyncStorage.setItem('currentUserId', user.uid);

            try {
                await createOrUpdateUserProfile(user);
            } catch (profileError) {
                console.error("Error creating user profile:", profileError);
            }

            try {
                const userDoc = await getDoc(doc(firestore, "spotifyTokens", user.uid));

                if (userDoc.exists() && userDoc.data().accessToken) {
                    const shouldAutoEnable = await AsyncStorage.getItem('autoEnableBackground');
                    if (shouldAutoEnable === 'true') {
                        try {
                            await startBackgroundLocationTracking(user.uid);
                        } catch (bgError) {
                            console.log('Background location setup will be prompted later');
                        }
                    }

                    router.replace("/(tabs)/mapview");
                } else {
                    router.replace("/spotify-auth");
                }
            } catch (spotifyError) {
                console.error("Error checking Spotify tokens:", spotifyError);
                router.replace("/spotify-auth");
            }
        } catch (error) {
            console.error("Error handling user login:", error);
            setErrorMessage("Fehler beim Laden des Benutzerprofils. Bitte versuche es erneut.");
        } finally {
            setIsLoading(false);
            setIsCheckingAuth(false);
        }
    };

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
            case "auth/too-many-requests":
                setErrorMessage("Zu viele Anmeldeversuche. Bitte warte einen Moment.");
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
            // handleUserLogin wird automatisch durch onAuthStateChanged aufgerufen
        } catch (error) {
            handleAuthError(error);
            setIsLoading(false);
        }
    };

    const signUp = async () => {
        setErrorMessage("");
        setIsLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            // handleUserLogin wird automatisch durch onAuthStateChanged aufgerufen
        } catch (error) {
            handleAuthError(error);
            setIsLoading(false);
        }
    };

    // Loading-Screen während Auto-Login Check
    if (isCheckingAuth) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <View style={styles.logoContainer}>
                        <View style={styles.logoIcon}>
                            <Ionicons name="musical-notes" size={32} color="#3B82F6" />
                        </View>
                        <Text style={styles.logoText}>Notavi</Text>
                    </View>
                    <ActivityIndicator size="large" color="#3B82F6" style={styles.loadingIndicator} />
                    <Text style={styles.loadingText}>Lade Benutzerdaten...</Text>
                </View>
            </SafeAreaView>
        );
    }

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
                                        style={[styles.primaryButton, (isLoading || !email.trim() || !password.trim()) && styles.buttonDisabled]}
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
                                    <View style={styles.featureItem}>
                                        <Ionicons name="share" size={16} color="#F59E0B" />
                                        <Text style={styles.featureText}>Playlisten teilen</Text>
                                    </View>
                                    <View style={styles.featureItem}>
                                        <Ionicons name="notifications" size={16} color="#EF4444" />
                                        <Text style={styles.featureText}>Background Benachrichtigungen</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.bottomSpacing} />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingIndicator: {
        marginTop: 20,
        marginBottom: 12,
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
    },
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
    mainContent: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
    },
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
    bottomSpacing: {
        height: 40,
    },
});