import { db } from "@/config/firebaseConfig";
import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  setDoc, 
  serverTimestamp, 
  orderBy,
  updateDoc,
  deleteDoc,
  getDoc
} from "firebase/firestore";
import { normalizeEmail } from "./FriendProvider";

export interface GroupMember {
  email: string;
  name: string;
  uid?: string | null;
}

export interface Group {
  id: string;
  name: string;
  members: GroupMember[];
  createdBy: string;
  createdAt: any;
  balances: Record<string, number>; // Normalized email -> net balance
  grossBalances?: Record<string, { owe: number; owed: number }>;
  simplifyDebts: boolean;
}

/**
 * Creates a new group with a shared ledger.
 */
export async function createGroup(
  name: string,
  members: GroupMember[],
  creatorId: string,
  creatorName?: string
): Promise<string> {
  const groupRef = doc(collection(db, "groups"));
  
  const balances: Record<string, number> = {};
  const grossBalances: Record<string, { owe: number; owed: number }> = {};
  
  members.forEach(member => {
    const key = normalizeEmail(member.email);
    balances[key] = 0;
    grossBalances[key] = { owe: 0, owed: 0 };
  });

  await setDoc(groupRef, {
    name: name.trim(),
    members,
    createdBy: creatorId,
    createdAt: serverTimestamp(),
    balances,
    grossBalances,
    simplifyDebts: false,
    participantEmails: members.map(m => m.email.toLowerCase().trim()), // For easier querying
  });

  return groupRef.id;
}

/**
 * Retrieves all groups the user is a member of.
 */
export async function getUserGroups(userEmail: string): Promise<Group[]> {
  const email = userEmail.toLowerCase().trim();
  const q = query(
    collection(db, "groups"),
    where("participantEmails", "array-contains", email),
    orderBy("createdAt", "desc")
  );

  try {
    const snap = await getDocs(q);
    const groups: Group[] = [];
    snap.forEach(docSnap => {
      groups.push({ id: docSnap.id, ...docSnap.data() } as Group);
    });
    return groups;
  } catch (err) {
    console.error("[getUserGroups] Failed:", err);
    return [];
  }
}

/**
 * Updates group metadata (like renaming).
 */
export async function updateGroup(groupId: string, data: Partial<Group>): Promise<void> {
  const groupRef = doc(db, "groups", groupId);
  await updateDoc(groupRef, {
     ...data,
     lastUpdated: serverTimestamp()
  });
}

/**
 * Deletes a group permanently.
 */
export async function deleteGroup(groupId: string): Promise<void> {
  await deleteDoc(doc(db, "groups", groupId));
}

/**
 * Leaves a group. Only possible if the member has a 0 balance.
 */
export async function leaveGroup(groupId: string, email: string): Promise<void> {
  const groupRef = doc(db, "groups", groupId);
  const snap = await getDoc(groupRef);
  if (!snap.exists()) return;

  const data = snap.data() as Group;
  const emailKey = normalizeEmail(email);
  if (Math.abs(data.balances[emailKey] || 0) > 0.01) {
    throw new Error("You cannot leave a group with a non-zero balance.");
  }

  const newMembers = data.members.filter(m => m.email.toLowerCase() !== email.toLowerCase());
  const newParticipantEmails = (data as any).participantEmails.filter((e: string) => e.toLowerCase() !== email.toLowerCase());

  await updateDoc(groupRef, {
    members: newMembers,
    participantEmails: newParticipantEmails,
  });
}

