import React from 'react';

// Direkte Wiederverwendung der geteilten Komponente
import { CreateGeoPlaylistModal } from '@/components/CreateGeoPlaylistModal';

interface CreateGeoPlaylistMapModalProps {
    visible: boolean;
    onClose: () => void;
    selectedLocation: any;
    radius: number;
    setRadius: (radius: number) => void;
    spotifyPlaylists: any[];
    onCreated: () => void;
}

export default function CreateGeoPlaylistMapModal(props: CreateGeoPlaylistMapModalProps) {
    // Direkte Wiederverwendung der geteilten Komponente
    return <CreateGeoPlaylistModal {...props} />;
}