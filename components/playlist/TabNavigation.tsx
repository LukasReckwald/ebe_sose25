import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TabNavigationProps {
    currentView: 'overview' | 'search' | 'create';
    setCurrentView: (view: 'overview' | 'search' | 'create') => void;
}

export default function TabNavigation({ currentView, setCurrentView }: TabNavigationProps) {
    return (
        <View style={styles.tabContainer}>
            <TouchableOpacity
                style={[styles.tab, currentView === 'overview' && styles.activeTab]}
                onPress={() => setCurrentView('overview')}
            >
                <Ionicons
                    name="library-outline"
                    size={20}
                    color={currentView === 'overview' ? '#3B82F6' : '#6B7280'}
                />
                <Text style={[styles.tabText, currentView === 'overview' && styles.activeTabText]}>
                    Übersicht
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.tab, currentView === 'search' && styles.activeTab]}
                onPress={() => setCurrentView('search')}
            >
                <Ionicons
                    name="search-outline"
                    size={20}
                    color={currentView === 'search' ? '#3B82F6' : '#6B7280'}
                />
                <Text style={[styles.tabText, currentView === 'search' && styles.activeTabText]}>
                    Suchen
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tab, currentView === 'create' && styles.activeTab]}
                onPress={() => setCurrentView('create')}
            >
                <Ionicons
                    name="add-circle-outline"
                    size={20}
                    color={currentView === 'create' ? '#3B82F6' : '#6B7280'}
                />
                <Text style={[styles.tabText, currentView === 'create' && styles.activeTabText]}>
                    Erstellen
                </Text>
            </TouchableOpacity>
        </View>
    );
}
const styles = StyleSheet.create({
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingHorizontal: 20,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 6,
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#3B82F6',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
    },
    activeTabText: {
        color: '#3B82F6',
    },
});