import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SearchResultItem from '@/components/SearchResultItem';

interface SearchTabProps {
    onTrackPress: (track: any) => void;
    onSearch: (query: string) => Promise<any[]>;
}

export default function SearchTab({ onTrackPress, onSearch }: SearchTabProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const results = await onSearch(searchQuery);
            setSearchResults(results);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionLabel}>Musik suchen</Text>
                    <Text style={styles.sectionSubtitle}>
                        Finde Songs und füge sie zu deinen Playlists hinzu
                    </Text>
                </View>

                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Nach Songs, Künstlern oder Albums suchen..."
                        style={styles.searchInput}
                        placeholderTextColor="#9CA3AF"
                        onSubmitEditing={handleSearch}
                    />
                    <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
                        {isSearching ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Ionicons name="search" size={18} color="white" />
                        )}
                    </TouchableOpacity>
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Suchergebnisse */}
                {searchResults.length > 0 && (
                    <View style={styles.searchResults}>
                        <Text style={styles.searchResultsTitle}>Suchergebnisse</Text>
                        {searchResults.map((item: any) => (
                            <SearchResultItem
                                key={item.id}
                                track={item}
                                onPress={() => onTrackPress(item)}
                            />
                        ))}
                    </View>
                )}

                {searchQuery && searchResults.length === 0 && !isSearching && (
                    <View style={styles.noResultsContainer}>
                        <Ionicons name="search" size={48} color="#9CA3AF" />
                        <Text style={styles.noResultsText}>Keine Ergebnisse gefunden</Text>
                        <Text style={styles.noResultsSubtext}>
                            Versuche es mit anderen Suchbegriffen
                        </Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        marginBottom: 16,
    },
    sectionLabel: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#6B7280',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        marginBottom: 20,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
        height: '100%',
    },
    searchButton: {
        backgroundColor: '#3B82F6',
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    clearButton: {
        marginLeft: 8,
    },
    searchResults: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    searchResultsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 12,
    },
    noResultsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    noResultsText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#6B7280',
        marginTop: 12,
    },
    noResultsSubtext: {
        fontSize: 14,
        color: '#9CA3AF',
        marginTop: 4,
    },
});