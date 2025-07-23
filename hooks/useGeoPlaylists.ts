import { useState, useEffect, useCallback } from 'react';
import { auth } from '@/firebaseConfig';
import {
    getFirestore,
    collection,
    query,
    where,
    onSnapshot,
} from 'firebase/firestore';

interface GeoPlaylist {
    id: string;
    name: string;
    location: {
        latitude: number;
        longitude: number;
    } | null;
    radius: number;
    spotifyPlaylistId: string;
    spotifyPlaylistName: string;
    spotifyPlaylistImage?: string;
    isActive: boolean;
    userId: string;
    createdAt: any;
    sharedWith?: string[];
    isShared?: boolean;
    originalOwnerId?: string;
}

export function useGeoPlaylists() {
    const [geoPlaylists, setGeoPlaylists] = useState<GeoPlaylist[]>([]);
    const [activeGeoPlaylists, setActiveGeoPlaylists] = useState<GeoPlaylist[]>([]);

    useEffect(() => {
        if (!auth.currentUser) return;

        const db = getFirestore();
        const geoPlaylistsRef = collection(db, 'geoPlaylists');
        const q = query(geoPlaylistsRef, where('userId', '==', auth.currentUser.uid));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const playlists: GeoPlaylist[] = [];
            snapshot.forEach((doc) => {
                playlists.push({
                    id: doc.id,
                    ...doc.data()
                } as GeoPlaylist);
            });

            setGeoPlaylists(playlists);
        });

        return unsubscribe;
    }, []);

    const getDistance = useCallback((point1: {latitude: number, longitude: number}, point2: {latitude: number, longitude: number}) => {
        const R = 6371000; // Earth's radius in meters
        const lat1 = point1.latitude * Math.PI / 180;
        const lat2 = point2.latitude * Math.PI / 180;
        const deltaLat = (point2.latitude - point1.latitude) * Math.PI / 180;
        const deltaLon = (point2.longitude - point1.longitude) * Math.PI / 180;

        const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    }, []);

    const checkActiveGeoPlaylists = useCallback((userLocation: {latitude: number, longitude: number} | null) => {
        if (!userLocation) {
            setActiveGeoPlaylists([]);
            return;
        }

        const active = geoPlaylists.filter(geoPlaylist => {
            if (!geoPlaylist.isActive || !geoPlaylist.location) {
                return false;
            }

            const distance = getDistance(userLocation, geoPlaylist.location);
            return distance <= geoPlaylist.radius;
        });

        setActiveGeoPlaylists(active);
    }, [geoPlaylists, getDistance]);

    return {
        geoPlaylists,
        activeGeoPlaylists,
        checkActiveGeoPlaylists
    };
}