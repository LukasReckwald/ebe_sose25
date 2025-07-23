import React from 'react';
import { ScrollView, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import InvitationCard from './InvitationCard';

interface InvitationsListProps {
    invitations: any[];
    isLoading: boolean;
    processingInvitations: Set<string>;
    onAccept: (invitation: any) => void;
    onDecline: (invitation: any) => void;
}

export default function InvitationsList({
                                            invitations,
                                            isLoading,
                                            processingInvitations,
                                            onAccept,
                                            onDecline
                                        }: InvitationsListProps) {
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.loadingText}>Lade Einladungen...</Text>
            </View>
        );
    }

    if (invitations.length === 0) {
        return (
            <View style={styles.emptyState}>
                <Ionicons name="mail-outline" size={64} color="#9CA3AF" />
                <Text style={styles.emptyStateTitle}>Keine Einladungen</Text>
                <Text style={styles.emptyStateText}>
                    Du hast derzeit keine ausstehenden Einladungen zu Geo-Playlisten.
                </Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.modalContent}>
            {invitations.map((invitation) => (
                <InvitationCard
                    key={invitation.id}
                    invitation={invitation}
                    isProcessing={processingInvitations.has(invitation.id)}
                    onAccept={() => onAccept(invitation)}
                    onDecline={() => onDecline(invitation)}
                />
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    modalContent: {
        flex: 1,
        padding: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    loadingText: {
        fontSize: 16,
        color: "#6B7280",
        marginTop: 16,
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 60,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#4B5563",
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 14,
        color: "#6B7280",
        textAlign: "center",
        lineHeight: 20,
    },
});