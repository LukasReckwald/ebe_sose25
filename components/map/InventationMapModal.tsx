import React from 'react';
import { Modal } from 'react-native';

// Wiederverwendung der InvitationSystem-Komponente
import { InvitationSystem } from '@/components/shared/InvitationSystem';

interface InvitationMapModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function InvitationMapModal({ visible, onClose }: InvitationMapModalProps) {
    // Einfache Weiterleitung an die geteilte Komponente
    return (
        <InvitationSystem
            visible={visible}
            onClose={onClose}
        />
    );
}