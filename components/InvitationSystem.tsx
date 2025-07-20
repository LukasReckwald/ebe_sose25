import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Wiederverwendbare Komponenten
import InvitationsList from './InvitationsList';
import { useInvitations } from '@/hooks/useInvitations';

interface InvitationSystemProps {
    visible: boolean;
    onClose: () => void;
}

export function InvitationSystem({ visible, onClose }: InvitationSystemProps) {
    const {
        invitations,
        isLoading,
        acceptInvitation,
        declineInvitation,
        processingInvitations
    } = useInvitations(visible);

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Einladungen</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                <InvitationsList
                    invitations={invitations}
                    isLoading={isLoading}
                    processingInvitations={processingInvitations}
                    onAccept={acceptInvitation}
                    onDecline={declineInvitation}
                />
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
        backgroundColor: "white",
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: "#1F2937",
    },
});