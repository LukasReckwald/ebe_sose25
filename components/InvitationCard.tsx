import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InvitationCardProps {
    invitation: any;
    isProcessing: boolean;
    onAccept: () => void;
    onDecline: () => void;
}

export default function InvitationCard({
                                           invitation,
                                           isProcessing,
                                           onAccept,
                                           onDecline
                                       }: InvitationCardProps) {
    return (
        <View style={styles.invitationCard}>
            <View style={styles.invitationHeader}>
                <Ionicons name="share" size={20} color="#8B5CF6" />
                <Text style={styles.invitationTitle}>Playlist-Einladung</Text>
            </View>

            <View style={styles.invitationContent}>
                <Text style={styles.invitationText}>
                    <Text style={styles.senderName}>{invitation.fromUserName}</Text>
                    {invitation.fromUserEmail && (
                        <Text style={styles.senderEmail}> ({invitation.fromUserEmail})</Text>
                    )}
                    {' '}hat dich zur Geo-Playlist{' '}
                    <Text style={styles.playlistName}>"{invitation.geoPlaylistName}"</Text>
                    {' '}eingeladen.
                </Text>

                <View style={styles.playlistInfo}>
                    <Ionicons name="musical-notes" size={16} color="#6B7280" />
                    <Text style={styles.playlistInfoText}>
                        Spotify-Playlist: {invitation.geoPlaylistName}
                    </Text>
                </View>

                <Text style={styles.invitationDate}>
                    {invitation.createdAt?.toDate?.()?.toLocaleDateString('de-DE', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </Text>
            </View>

            <View style={styles.invitationActions}>
                <TouchableOpacity
                    style={[
                        styles.actionButton,
                        styles.declineButton,
                        isProcessing && styles.actionButtonDisabled
                    ]}
                    onPress={onDecline}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <>
                            <Ionicons name="close" size={16} color="white" />
                            <Text style={styles.actionButtonText}>Ablehnen</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.actionButton,
                        styles.acceptButton,
                        isProcessing && styles.actionButtonDisabled
                    ]}
                    onPress={onAccept}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <>
                            <Ionicons name="checkmark" size={16} color="white" />
                            <Text style={styles.actionButtonText}>Annehmen</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    invitationCard: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    invitationHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    invitationTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginLeft: 8,
    },
    invitationContent: {
        marginBottom: 16,
    },
    invitationText: {
        fontSize: 14,
        color: "#4B5563",
        lineHeight: 20,
        marginBottom: 12,
    },
    senderName: {
        fontWeight: "600",
        color: "#1F2937",
    },
    senderEmail: {
        color: "#6B7280",
        fontSize: 13,
    },
    playlistName: {
        fontWeight: "600",
        color: "#3B82F6",
    },
    playlistInfo: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    playlistInfoText: {
        fontSize: 13,
        color: "#6B7280",
        marginLeft: 6,
    },
    invitationDate: {
        fontSize: 12,
        color: "#9CA3AF",
        fontStyle: "italic",
    },
    invitationActions: {
        flexDirection: "row",
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 6,
    },
    actionButtonDisabled: {
        opacity: 0.6,
    },
    actionButtonText: {
        color: "white",
        fontSize: 14,
        fontWeight: "600",
    },
    declineButton: {
        backgroundColor: "#DC2626",
    },
    acceptButton: {
        backgroundColor: "#10B981",
    },
});