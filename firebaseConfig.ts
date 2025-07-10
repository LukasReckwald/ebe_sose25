// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyASoUOy4tIRb2m28ul1NIxG4_Mj1amjrrI",
    authDomain: "ebe-project-sose2025.firebaseapp.com",
    projectId: "ebe-project-sose2025",
    storageBucket: "ebe-project-sose2025.firebasestorage.app",
    messagingSenderId: "104336738420",
    appId: "1:104336738420:web:9d3ecb5e84a2a5c6daa921"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});