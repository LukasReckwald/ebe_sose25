// utils/userManagement.ts
import { auth } from '@/firebaseConfig';
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    serverTimestamp,
    addDoc,
    getDocs,
    query,
    where,
    deleteDoc
} from 'firebase/firestore';

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    createdAt: any;
    lastLoginAt: any;
    preferences?: {
        notifications: boolean;
        autoAcceptInvitations: boolean;
    };
}

export const createOrUpdateUserProfile = async (user: any): Promise<UserProfile> => {
    const db = getFirestore();
    const userRef = doc(db, 'users', user.uid);

    try {
        const userDoc = await getDoc(userRef);

        const userData: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || user.email || 'User',
            photoURL: user.photoURL || '',
            createdAt: userDoc.exists() ? userDoc.data().createdAt : serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            preferences: userDoc.exists() ? userDoc.data().preferences : {
                notifications: true,
                autoAcceptInvitations: false
            }
        };

        if (userDoc.exists()) {
            // Update existing user
            await updateDoc(userRef, {
                lastLoginAt: serverTimestamp(),
                email: userData.email,
                displayName: userData.displayName,
                photoURL: userData.photoURL
            });
        } else {
            // Create new user
            await setDoc(userRef, userData);
        }

        return userData;
    } catch (error: any) {
        console.error('Error creating/updating user profile:', error);

        // Spezifische Fehlerbehandlung
        if (error.code === 'permission-denied') {
            throw new Error('Berechtigung verweigert. Bitte prüfe die Firestore Rules.');
        } else if (error.code === 'unavailable') {
            throw new Error('Firestore ist nicht verfügbar. Bitte versuche es später erneut.');
        } else {
            throw new Error('Fehler beim Erstellen des Benutzerprofils.');
        }
    }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    const db = getFirestore();
    const userRef = doc(db, 'users', uid);

    try {
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            return userDoc.data() as UserProfile;
        }

        return null;
    } catch (error) {
        console.error('Error getting user profile:', error);
        return null;
    }
};

export const updateUserPreferences = async (preferences: Partial<UserProfile['preferences']>): Promise<void> => {
    if (!auth.currentUser) {
        throw new Error('No authenticated user');
    }

    const db = getFirestore();
    const userRef = doc(db, 'users', auth.currentUser.uid);

    try {
        await updateDoc(userRef, {
            preferences: preferences
        });
    } catch (error) {
        console.error('Error updating user preferences:', error);
        throw error;
    }
};

// Auth State Observer für automatisches User-Profile Management
export const setupAuthStateObserver = () => {
    return auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                await createOrUpdateUserProfile(user);
            } catch (error) {
                console.error('Error handling auth state change:', error);
            }
        }
    });
};

// Utility für Playlist-Sharing
export const findUserByEmail = async (email: string): Promise<UserProfile | null> => {
    const db = getFirestore();
    const usersRef = collection(db, 'users');

    try {
        const q = query(usersRef, where('email', '==', email.toLowerCase().trim()));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            return querySnapshot.docs[0].data() as UserProfile;
        }

        return null;
    } catch (error) {
        console.error('Error finding user by email:', error);
        return null;
    }
};

// Die Firestore Rules werden direkt in der Firebase Console eingestellt
// Siehe Implementierungsanleitung für die genauen Rules

// Notification Service für Push-Benachrichtigungen (optional)
export const sendPlaylistInvitationNotification = async (
    toUserId: string,
    fromUserName: string,
    playlistName: string
): Promise<void> => {
    // Hier würde eine Push-Notification gesendet werden
    // Z.B. mit Firebase Cloud Messaging oder einem anderen Service
    console.log(`Notification sent to ${toUserId}: ${fromUserName} shared playlist ${playlistName}`);
};

// Helper für Einladungs-Management
export const createPlaylistInvitation = async (
    toUserEmail: string,
    geoPlaylistId: string,
    geoPlaylistName: string,
    spotifyPlaylistId: string
): Promise<void> => {
    if (!auth.currentUser) {
        throw new Error('No authenticated user');
    }

    const db = getFirestore();

    try {
        // Finde den Empfänger
        const targetUser = await findUserByEmail(toUserEmail);
        if (!targetUser) {
            throw new Error('User not found');
        }

        // Erstelle Einladung
        const invitation = {
            from: auth.currentUser.uid,
            to: targetUser.uid,
            geoPlaylistId,
            geoPlaylistName,
            spotifyPlaylistId,
            status: 'pending',
            createdAt: serverTimestamp()
        };

        await addDoc(collection(db, 'geoPlaylistInvitations'), invitation);

        // Sende Benachrichtigung (optional)
        await sendPlaylistInvitationNotification(
            targetUser.uid,
            auth.currentUser.displayName || auth.currentUser.email || 'Someone',
            geoPlaylistName
        );

    } catch (error) {
        console.error('Error creating playlist invitation:', error);
        throw error;
    }
};

// Helper für Auto-Accept Feature
export const checkAutoAcceptInvitations = async (userId: string): Promise<boolean> => {
    const profile = await getUserProfile(userId);
    return profile?.preferences?.autoAcceptInvitations || false;
};

// Export der notwendigen Firestore imports - ENTFERNT, da bereits oben importiert