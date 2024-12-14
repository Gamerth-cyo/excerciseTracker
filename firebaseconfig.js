// Importa los módulos específicos de Firebase
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';


// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA-pc674FdWtxMD8f2KVSvwgEqXPtB6k-Y",
  authDomain: "com.seshosoft.myCustomExerciseApp",
  projectId: "customexerciseapp",
  storageBucket: "customexerciseapp.appspot.com",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "1:285512159590:android:c91d1b2d3b69369cb5c407",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exporta la autenticación y la base de datos
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const db = getFirestore(app);


