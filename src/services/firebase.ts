import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBnDW1Vsqrr2kdt662XwOQvKuKiLb53u20",
  authDomain: "bill-reminder-app-2d99f.firebaseapp.com",
  projectId: "bill-reminder-app-2d99f",
  storageBucket: "bill-reminder-app-2d99f.firebasestorage.app",
  messagingSenderId: "830707462078",
  appId: "1:830707462078:web:4c49df12c3cf89c3f093ef",
  measurementId: "G-LNKK6H0LTS",
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Serviços disponíveis
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
