import {
  signInWithEmailAndPassword,
  signInWithCredential,
  signInWithPopup,
  GoogleAuthProvider,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  sendPasswordResetEmail,
  confirmPasswordReset,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import {
  deleteApp,
  initializeApp,
  type FirebaseApp,
} from 'firebase/app';
import {
  initializeAuth,
  inMemoryPersistence,
  type Auth,
} from 'firebase/auth';
import { getFirebaseAuth } from '../firebase/auth';
import { getDb } from '../firebase/firestore';
import { firebaseConfig, googleClientId } from '../firebase/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { now } from './helpers';
import type { UserRole } from '../rbac/types';

export interface LoginUser {
  id: string;
  user_id?: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  phone?: string;
  designation?: string;
  coordinator_id?: string;
  coordinator_type?: string;
  college?: string;
  city?: string;
  year_of_study?: string;
  profile_picture?: string;
  profile_completed?: number;
  google_id?: string;
}

export interface LoginResult {
  token: string;
  user: LoginUser;
  is_first_login?: boolean;
}

export interface VerifyResult {
  valid: boolean;
  user?: {
    id: string;
    user_id: string;
    role: string;
    email: string;
  };
  is_first_login?: boolean;
}

export interface UserRecord {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  username: string;
  role: string;
  status: string;
  is_first_login: boolean;
  mustChangePassword?: boolean;
  passwordStatus?: string;
  passwordChangedAt?: string | null;
  coordinator_type?: string;
  notes?: string;
  password_changed_at: string | null;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  created_by: string;
  assigned_event_ids?: string[];
  coordinator_id?: string;
}

export interface ParticipantRecord {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  college?: string;
  city?: string;
  department?: string;
  year_of_study?: string;
  gender?: string;
  register_number?: string;
  student_id?: string;
  profile_picture?: string;
  profile_completed: boolean;
  google_id?: string;
  created_at: string;
  payment_status?: string;
  payment_screenshot_url?: string;
  transaction_id?: string;
  payment_amount?: number;
  payment_uploaded_time?: string;
  payment_remarks?: string;
  event_ids: string[];
  verificationStatus?: string;
  verifiedBy?: string;
  verifiedByUserId?: string;
  verifiedAt?: string;
  verificationRemarks?: string;
}

export function mapFirebaseAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/invalid-email':
    case 'auth/user-not-found':
      return 'Invalid email or password.';
    case 'auth/user-disabled':
      return 'Your account has been disabled. Contact the administrator.';
    case 'auth/too-many-requests':
      return 'Too many sign-in attempts. Please try again later.';
    case 'auth/email-already-in-use':
      return 'An account already exists for this email address.';
    case 'auth/invalid-action-code':
      return 'This reset link is invalid or has expired. Please request a new one.';
    case 'auth/weak-password':
      return 'The password is too weak. Choose a stronger password.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/internal-error':
      return 'Authentication failed. Please try again.';
    default:
      return err instanceof Error ? err.message : 'Authentication failed. Please try again.';
  }
}

export async function readUserRecord(uid: string): Promise<UserRecord | null> {
  const db = getDb();
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as UserRecord) : null;
}

export async function readParticipantRecord(uid: string): Promise<ParticipantRecord | null> {
  const db = getDb();
  const snap = await getDoc(doc(db, 'participants', uid));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as ParticipantRecord) : null;
}

/**
 * Creates a Firebase Auth user without switching the current session.
 * Uses a throwaway app instance with in-memory persistence.
 */
export async function createUserInProject(email: string, password: string): Promise<string> {
  const tmpApp: FirebaseApp = initializeApp(firebaseConfig, `casyum-tmp-${Date.now()}`);
  const tmpAuth: Auth = initializeAuth(tmpApp, { persistence: inMemoryPersistence });
  try {
    const cred = await createUserWithEmailAndPassword(tmpAuth, email, password);
    return cred.user.uid;
  } finally {
    await deleteApp(tmpApp);
  }
}

export async function ensureSignedIn(): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (auth.currentUser) return auth.currentUser;
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (u) => {
      unsub();
      resolve(u);
    });
  });
}

export function getCurrentUser(): User | null {
  return getFirebaseAuth().currentUser;
}

export function isAuthenticated(): boolean {
  return getFirebaseAuth().currentUser !== null;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getFirebaseAuth());
}

export async function employeeLogin(email: string, password: string): Promise<LoginResult> {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password).catch((err) => {
    throw new Error(mapFirebaseAuthError(err));
  });
  const record = await readUserRecord(credential.user.uid);
  if (!record) {
    throw new Error('Account not found. Please contact the administrator.');
  }
  if (record.status === 'Inactive' || record.status === 'Deleted' || record.status === 'Suspended') {
    throw new Error('Your account has been deactivated. Contact the administrator.');
  }
  await updateDoc(doc(getDb(), 'users', record.id), {
    last_login: now(),
    updated_at: now(),
  });
  return {
    token: await credential.user.getIdToken(),
    user: {
      id: record.id,
      user_id: record.user_id,
      name: record.full_name,
      email: record.email,
      role: record.role as UserRole,
      department: record.department,
      phone: record.phone,
      designation: record.designation,
      coordinator_id: record.coordinator_id || record.user_id,
      coordinator_type: record.coordinator_type,
    },
    is_first_login: record.is_first_login === true || record.mustChangePassword === true,
  };
}

export function googleConfig(): { clientId: string } {
  return { clientId: googleClientId };
}

export async function googleLoginPopup(): Promise<LoginResult> {
  const auth = getFirebaseAuth();
  const result = await signInWithPopup(auth, new GoogleAuthProvider()).catch((err) => {
    const code = (err as { code?: string })?.code || '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw new Error('Google sign-in was cancelled. Please try again.');
    }
    throw new Error(mapFirebaseAuthError(err));
  });
  const uid = result.user.uid;

  const staff = await readUserRecord(uid);
  if (staff) {
    throw new Error('This Google account is registered as staff. Please use the Staff Sign In.');
  }

  let record = await readParticipantRecord(uid);
  if (!record) {
    await setDocParticipant(uid, {
      full_name: result.user.displayName || 'Participant',
      email: result.user.email || '',
      profile_picture: result.user.photoURL || '',
      google_id: uid,
    });
    record = await readParticipantRecord(uid);
  }

  return {
    token: await result.user.getIdToken(),
    user: {
      id: uid,
      name: record?.full_name || result.user.displayName || 'Participant',
      email: record?.email || result.user.email || '',
      role: 'Participant',
      phone: record?.phone,
      department: record?.department,
      college: record?.college,
      city: record?.city,
      year_of_study: record?.year_of_study,
      profile_picture: record?.profile_picture || result.user.photoURL || '',
      profile_completed: record?.profile_completed === true ? 1 : 0,
      google_id: record?.google_id,
    },
    is_first_login: false,
  };
}

export async function googleLogin(credential: string): Promise<LoginResult> {
  const auth = getFirebaseAuth();
  const result = await signInWithCredential(auth, GoogleAuthProvider.credential(credential)).catch(
    (err) => {
      throw new Error(mapFirebaseAuthError(err));
    }
  );
  const uid = result.user.uid;

  const staff = await readUserRecord(uid);
  if (staff) {
    throw new Error('This Google account is registered as staff. Please use the Staff Sign In.');
  }

  let record = await readParticipantRecord(uid);
  if (!record) {
    await setDocParticipant(uid, {
      full_name: result.user.displayName || 'Participant',
      email: result.user.email || '',
      profile_picture: result.user.photoURL || '',
      google_id: uid,
    });
    record = await readParticipantRecord(uid);
  }

  return {
    token: await result.user.getIdToken(),
    user: {
      id: uid,
      name: record?.full_name || result.user.displayName || 'Participant',
      email: record?.email || result.user.email || '',
      role: 'Participant',
      phone: record?.phone,
      department: record?.department,
      college: record?.college,
      city: record?.city,
      year_of_study: record?.year_of_study,
      profile_picture: record?.profile_picture || result.user.photoURL || '',
      profile_completed: record?.profile_completed === true ? 1 : 0,
      google_id: record?.google_id,
    },
    is_first_login: false,
  };
}

async function setDocParticipant(uid: string, data: Partial<ParticipantRecord>): Promise<void> {
  const db = getDb();
  const record: Partial<ParticipantRecord> = {
    id: uid,
    profile_completed: false,
    created_at: now(),
    payment_status: 'Pending',
    payment_amount: 0,
    event_ids: [],
    ...data,
  };
  await setDoc(doc(db, 'participants', uid), record);
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<{ message: string }> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in to change your password.');
  }
  const email = user.email;
  if (!email) {
    throw new Error('Unable to verify your account email.');
  }
  if (newPassword !== confirmPassword) {
    throw new Error('Passwords do not match.');
  }
  await reauthenticateWithCredential(
    user,
    EmailAuthProvider.credential(email, currentPassword)
  ).catch((err) => {
    throw new Error(mapFirebaseAuthError(err));
  });
  await updatePassword(user, newPassword).catch((err) => {
    throw new Error(mapFirebaseAuthError(err));
  });
  await updateDoc(doc(getDb(), 'users', user.uid), {
    is_first_login: false,
    mustChangePassword: false,
    passwordStatus: 'updated',
    passwordChangedAt: now(),
    password_changed_at: now(),
    updated_at: now(),
  });
  return { message: 'Password updated successfully' };
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  await sendPasswordResetEmail(getFirebaseAuth(), email).catch((err) => {
    throw new Error(mapFirebaseAuthError(err));
  });
  return { message: 'Password reset email sent.' };
}

export async function resetPassword(
  _email: string,
  oobCode: string,
  newPassword: string,
  confirmPassword: string
): Promise<{ message: string }> {
  if (!oobCode) {
    throw new Error('Invalid reset link. Please request a new password reset.');
  }
  if (newPassword !== confirmPassword) {
    throw new Error('Passwords do not match.');
  }
  await confirmPasswordReset(getFirebaseAuth(), oobCode, newPassword).catch((err) => {
    throw new Error(mapFirebaseAuthError(err));
  });
  return { message: 'Password reset successfully' };
}

export async function verifyToken(): Promise<VerifyResult> {
  const user = await ensureSignedIn();
  if (!user) return { valid: false };
  const uid = user.uid;

  const staff = await readUserRecord(uid);
  if (staff) {
    return {
      valid: true,
      user: {
        id: uid,
        user_id: staff.user_id,
        role: staff.role,
        email: staff.email,
      },
      is_first_login: staff.is_first_login === true || staff.mustChangePassword === true,
    };
  }

  const participant = await readParticipantRecord(uid);
  if (participant) {
    return {
      valid: true,
      user: {
        id: uid,
        user_id: uid,
        role: 'Participant',
        email: participant.email || '',
      },
      is_first_login: false,
    };
  }

  return { valid: false };
}
