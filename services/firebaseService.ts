import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, push, remove } from 'firebase/database';
import { EvacuationMarker, EmergencyContact } from '../types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const MARKERS_PATH = 'markers';
const CONTACTS_PATH = 'contacts';

// --- Realtime Listeners ---

export const listenToMarkers = (callback: (markers: EvacuationMarker[]) => void) => {
  const markersRef = ref(db, MARKERS_PATH);
  return onValue(markersRef, (snapshot) => {
    const data = snapshot.val();
    const markersArray: EvacuationMarker[] = data ? Object.keys(data).map(key => ({ ...data[key], id: key })) : [];
    callback(markersArray);
  });
};

export const listenToContacts = (callback: (contacts: EmergencyContact[]) => void) => {
  const contactsRef = ref(db, CONTACTS_PATH);
  return onValue(contactsRef, (snapshot) => {
    const data = snapshot.val();
    const contactsArray: EmergencyContact[] = data ? Object.keys(data).map(key => ({ ...data[key], id: key })) : [];
    callback(contactsArray);
  });
};

// --- Marker Operations ---

export const addMarker = async (marker: Omit<EvacuationMarker, 'id'>): Promise<string> => {
  const markersRef = ref(db, MARKERS_PATH);
  const newMarkerRef = push(markersRef);
  await set(newMarkerRef, marker);
  return newMarkerRef.key!;
};

export const updateMarker = (marker: EvacuationMarker) => {
  const { id, ...data } = marker;
  const markerRef = ref(db, `${MARKERS_PATH}/${id}`);
  return set(markerRef, data);
};

export const deleteMarker = (markerId: string) => {
  const markerRef = ref(db, `${MARKERS_PATH}/${markerId}`);
  return remove(markerRef);
};


// --- Contact Operations ---

export const addContact = async (contact: Omit<EmergencyContact, 'id'>): Promise<string> => {
  const contactsRef = ref(db, CONTACTS_PATH);
  const newContactRef = push(contactsRef);
  await set(newContactRef, contact);
  return newContactRef.key!;
};

export const deleteContact = (contactId: string) => {
  const contactRef = ref(db, `${CONTACTS_PATH}/${contactId}`);
  return remove(contactRef);
};