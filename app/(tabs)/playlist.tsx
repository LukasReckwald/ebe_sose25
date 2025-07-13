import {View, Text, Platform, StyleSheet} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import {SafeAreaView} from 'react-native-safe-area-context';

export default function Playlist() {
    return (
        <SafeAreaView style={{ flex: 1 }}>
            <Text>
                Spotify Playlist App
            </Text>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
});