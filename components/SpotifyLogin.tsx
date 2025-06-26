import React, { useEffect, useState } from 'react';
import { Button, Text, View } from 'react-native';
import * as AuthSession from 'expo-auth-session';

const CLIENT_ID = 'b2e0f32a87604e3cb0ab618c66633346'; // Deine Spotify Client ID
const REDIRECT_URI = AuthSession.makeRedirectUri({
    useProxy: true, // Wichtig für Expo Go, Proxy für lokale Umgebungen
});
const SCOPES = [
    'user-read-email',
    'playlist-read-private',
    'user-modify-playback-state',
];

const discovery = {
    authorizationEndpoint: 'https://accounts.spotify.com/authorize',
    tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export default function SpotifyLogin() {
    const [accessToken, setAccessToken] = useState(null);
    const [userInfo, setUserInfo] = useState(null);

    console.log(REDIRECT_URI);

    const [request, response, promptAsync] = AuthSession.useAuthRequest(
        {
            clientId: CLIENT_ID,
            redirectUri: REDIRECT_URI,
            scopes: SCOPES,
            responseType: 'code', // Wichtig für den Code-Flow
            usePKCE: true, // Aktiviert PKCE für mehr Sicherheit
        },
        discovery
    );

    useEffect(() => {
        const fetchToken = async () => {
            if (response?.type === 'success') {
                const { code } = response.params;
                console.log('✅ Code erhalten:', code);

                try {
                    // Austausch des Codes gegen ein Access Token
                    const tokenResponse = await AuthSession.exchangeCodeAsync(
                        {
                            clientId: CLIENT_ID,
                            code,
                            redirectUri: REDIRECT_URI,
                            extraParams: {
                                code_verifier: request.codeVerifier, // PKCE Code Verifier
                            },
                        },
                        discovery
                    );

                    console.log('✅ Token Response:', tokenResponse);
                    setAccessToken(tokenResponse.accessToken);

                    // Optional: Benutzerinfo abrufen
                    const userRes = await fetch('https://api.spotify.com/v1/me', {
                        headers: {
                            Authorization: `Bearer ${tokenResponse.accessToken}`,
                        },
                    });
                    const user = await userRes.json();
                    setUserInfo(user);
                } catch (err) {
                    console.error('❌ Fehler beim Token-Austausch:', err);
                }
            } else if (response?.type === 'error') {
                console.error('❌ Fehler bei der Authentifizierung:', response.error);
            }
        };

        fetchToken();
    }, [response]);

    console.log(userInfo)

    return (
        <View style={{ margin: 20 }}>
            {accessToken ? (
                <View>
                    <Text style={{ fontSize: 18 }}>🎉 Eingeloggt als:</Text>
                    {userInfo ? (
                        <Text>{userInfo.display_name}</Text>
                    ) : (
                        <Text>Lade Benutzerdaten...</Text>
                    )}
                </View>
            ) : (
                <Button
                    title="Mit Spotify einloggen"
                    disabled={!request}
                    onPress={() => promptAsync()} // Einfach aufrufen, ohne useProxy hier
                />
            )}
        </View>
    );
}
