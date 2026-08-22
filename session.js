import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { auth } from './auth-client.js';
import { db } from './data-client.js';

const profileCollection = 'usuarios';

function normalizeProfile(snapshot, user) {
  if (!snapshot.exists()) return null;
  return {
    uid: user.uid,
    email: user.email || snapshot.data().email || null,
    ...snapshot.data()
  };
}

async function resolveSession(user) {
  if (!user) {
    return { status: 'unauthenticated', user: null, profile: null, reason: null };
  }

  try {
    const profileSnapshot = await getDoc(doc(db, profileCollection, user.uid));
    const profile = normalizeProfile(profileSnapshot, user);

    if (!profile) {
      return {
        status: 'no-profile',
        user,
        profile: null,
        reason: 'No existe un perfil operativo asociado a esta cuenta.'
      };
    }

    if (profile.activo !== true) {
      return {
        status: 'inactive',
        user,
        profile,
        reason: 'La cuenta está desactivada. Contacta al administrador.'
      };
    }

    return { status: 'authenticated', user, profile, reason: null };
  } catch (error) {
    return {
      status: 'profile-error',
      user,
      profile: null,
      reason: error?.code === 'permission-denied'
        ? 'La sesión inició, pero Firebase rechazó la lectura del perfil.'
        : 'No se pudo cargar el perfil operativo.'
    };
  }
}

export function startSession(onChange) {
  let disposed = false;
  onChange({ status: 'loading', user: null, profile: null, reason: null });

  const unsubscribe = onAuthStateChanged(auth, async user => {
    const session = await resolveSession(user);
    if (!disposed) onChange(session);
  });

  return () => {
    disposed = true;
    unsubscribe();
  };
}

export function hasRole(session, role) {
  return session?.status === 'authenticated' && session.profile?.rol === role;
}

export function hasWorkspace(session, workspace) {
  return session?.status === 'authenticated'
    && Array.isArray(session.profile?.espaciosTrabajo)
    && session.profile.espaciosTrabajo.includes(workspace);
}

export function hasAssignedLocality(session, localidadId) {
  return session?.status === 'authenticated'
    && session.profile?.rol === 'chofer'
    && Array.isArray(session.profile?.localidadIds)
    && session.profile.localidadIds.includes(localidadId);
}

export function defaultWorkspace(session) {
  return session?.profile?.espacioPredeterminado || null;
}
