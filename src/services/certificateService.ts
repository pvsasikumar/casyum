import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { getDb } from '../firebase/firestore';
import { nextSequence, now } from './helpers';

export interface CertificateRow {
  id: string;
  participant_id: string;
  participant_name: string;
  college: string;
  type: string;
  event_name: string;
  issue_date: string;
  certificate_code: string;
  download_url: string;
}

export async function listCertificates(): Promise<{ certificates: CertificateRow[] }> {
  const db = getDb();
  const snap = await getDocs(collection(db, 'certificates'));
  const certificates = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CertificateRow);
  certificates.sort((a, b) => String(b.issue_date || '').localeCompare(String(a.issue_date || '')));
  return { certificates };
}

export async function addCertificate(
  item: Omit<CertificateRow, 'id' | 'issue_date'>
): Promise<CertificateRow> {
  const db = getDb();
  const id = `cert-${String(await nextSequence('certificates'))}`;
  const row: CertificateRow = {
    ...item,
    id,
    issue_date: now(),
  };
  await setDoc(doc(db, 'certificates', id), row);
  return row;
}

export async function updateCertificate(id: string, patch: Partial<CertificateRow>): Promise<CertificateRow> {
  const db = getDb();
  await updateDoc(doc(db, 'certificates', id), patch);
  return { id, ...patch } as CertificateRow;
}

export async function deleteCertificate(id: string): Promise<{ message: string }> {
  const db = getDb();
  await deleteDoc(doc(db, 'certificates', id));
  return { message: 'Certificate deleted' };
}
