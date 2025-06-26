import { Text, View } from "react-native";
import React from 'react';
import SpotifyLogin from '../components/SpotifyLogin';
export default function Index() {
  return (
      <View
          style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
          }}
      >
      <SpotifyLogin/>

      </View>
  );
}
