// utils/spotifyTokenUtils.ts
import * as AuthSession from 'expo-auth-session';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { auth } from '@/firebaseConfig';

const SPOTIFY_CLIENT_ID = 'b2e0f32a87604e3cb0ab618c66633346';

const discovery = {
    authorizationEndpoint: 'https://accounts.spotify.com/authorize',
    tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export interface SpotifyTokens {
    accessToken: string;
    refreshToken: string;
    expiration: number;
}

/**
 * Lädt Spotify-Tokens aus Firebase für den aktuellen User
 */
export const loadSpotifyTokens = async (): Promise<SpotifyTokens | null> => {
    try {
        const uid = auth.currentUser?.uid;
        if (!uid) return null;

        const docRef = doc(getFirestore(), 'spotifyTokens', uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
                expiration: data.expiration,
            };
        }
        return null;
    } catch (error) {
        console.error('Fehler beim Laden der Spotify-Tokens:', error);
        return null;
    }
};

/**
 * Überprüft ob ein Token noch gültig ist (mit 1 Minute Puffer)
 */
export const isTokenValid = (expiration: number): boolean => {
    return expiration > Date.now() + 60000; // 1 Minute Puffer
};

/**
 * Erneuert Spotify Access Token mit Refresh Token
 */
export const refreshSpotifyToken = async (refreshToken: string): Promise<SpotifyTokens | null> => {
    try {
        const tokenResponse = await AuthSession.refreshAsync({
            clientId: SPOTIFY_CLIENT_ID,
            refreshToken,
        }, discovery);

        const { accessToken, expiresIn } = tokenResponse;
        const expiration = Date.now() + (expiresIn || 3600) * 1000;

        const newTokens: SpotifyTokens = {
            accessToken,
            refreshToken, // Behalte den bestehenden Refresh Token
            expiration,
        };

        // Speichere in Firebase
        await saveSpotifyTokens(newTokens);

        console.log('Spotify Token erfolgreich erneuert');
        return newTokens;
    } catch (error) {
        console.error('Token-Refresh fehlgeschlagen:', error);
        return null;
    }
};

/**
 * Speichert Spotify-Tokens in Firebase
 */
export const saveSpotifyTokens = async (tokens: SpotifyTokens): Promise<void> => {
    try {
        const uid = auth.currentUser?.uid;
        if (!uid) throw new Error('Kein authentifizierter User');

        await setDoc(doc(getFirestore(), 'spotifyTokens', uid), {
            ...tokens,
            updatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Fehler beim Speichern der Tokens:', error);
        throw error;
    }
};

/**
 * Holt gültige Spotify-Tokens (automatisches Refresh bei Bedarf)
 */
export const getValidSpotifyTokens = async (): Promise<SpotifyTokens | null> => {
    try {
        const tokens = await loadSpotifyTokens();
        if (!tokens) return null;

        // Prüfe ob Token noch gültig ist
        if (isTokenValid(tokens.expiration)) {
            return tokens;
        }

        // Token abgelaufen → versuche Refresh
        console.log('Token abgelaufen, erneuere automatisch...');
        const refreshedTokens = await refreshSpotifyToken(tokens.refreshToken);

        if (refreshedTokens) {
            return refreshedTokens;
        }

        console.log('Token-Refresh fehlgeschlagen');
        return null;
    } catch (error) {
        console.error('Fehler beim Abrufen gültiger Tokens:', error);
        return null;
    }
};

/**
 * Spotify API Wrapper mit automatischem Token-Management
 */
export const spotifyAPICall = async (endpoint: string, options: any = {}): Promise<any> => {
    const tokens = await getValidSpotifyTokens();

    if (!tokens) {
        throw new Error('Keine gültigen Spotify-Tokens verfügbar');
    }

    const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        throw new Error(`Spotify API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
};

/**
 * Löscht Spotify-Tokens aus Firebase
 */
export const clearSpotifyTokens = async (): Promise<void> => {
    try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        await setDoc(doc(getFirestore(), 'spotifyTokens', uid), {
            accessToken: '',
            refreshToken: '',
            expiration: 0,
            clearedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Fehler beim Löschen der Tokens:', error);
    }
};