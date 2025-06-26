import { Stack } from "expo-router";

export default function RootLayout() {
  return (
      <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: '#f4511e',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}>
        {/* Optionally configure static options outside the route.*/}
        <Stack.Screen name="index" options={{
            title: 'Home',
            headerShown: false,
        }} />
      </Stack>
  );
}
