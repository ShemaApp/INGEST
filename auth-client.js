import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import { firebaseApp } from './firebase-init.js';

export const auth = getAuth(firebaseApp);
export const observeSession = callback => onAuthStateChanged(auth, callback);
export const loginWithPassword = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);

export function authErrorMessage(error) {
  const code = error?.code || '';
  const messages = {
    'auth/invalid-credential': 'El correo o la contraseña no son correctos.',
    'auth/invalid-email': 'Escribe un correo electrónico válido.',
    'auth/user-disabled': 'Esta cuenta está deshabilitada. Contacta al administrador.',
    'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
    'auth/network-request-failed': 'No se pudo conectar con Firebase. Revisa tu conexión.'
  };
  return messages[code] || 'No fue posible iniciar sesión. Verifica tus datos e inténtalo de nuevo.';
}
