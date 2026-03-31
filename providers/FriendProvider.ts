import { db } from "@/config/firebaseConfig";
import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  setDoc, 
  serverTimestamp, 
  limit, 
} from "firebase/firestore";

export interface Friend {
  id: string;
  name: string;
  email?: string;
  linkedUserId: string | null;
  mirrorFriendDocId: string | null;
  totalBalance: number;
  createdAt: any;
  isDerived?: boolean;
}

export interface Friendship {
  id: string;
  participants: string[]; // [email1, email2]
  uids: string[]; // [uid1, uid2] - can be null if ghost
  balances: Record<string, number>; // { email: net_balance }
  names: Record<string, string>; // { email: display_name }
  lastUpdated: any;
  createdAt: any;
}

/**
 * Generates a deterministic ID for a pair of emails.
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim().replace(/[@.]/g, "_");
}

export function getFriendshipId(email1: string, email2: string): string {
  const sorted = [email1.toLowerCase().trim(), email2.toLowerCase().trim()].sort();
  return normalizeEmail(sorted[0]) + "__" + normalizeEmail(sorted[1]);
}

/**
 * Retrieves all friendships for the current user from the shared collection.
 */
export async function getFriendships(
  currentUserId: string,
  userEmail?: string | null
): Promise<{ friends: Friend[], totalOwe: number, totalOwed: number }> {
  if (!userEmail) return { friends: [], totalOwe: 0, totalOwed: 0 };
  
  const email = userEmail.toLowerCase().trim();
  const q = query(
    collection(db, "friendships"),
    where("participants", "array-contains", email)
  );

  try {
    const snap = await getDocs(q);
    const friends: Friend[] = [];
    let totalOwe = 0;
    let totalOwed = 0;

    snap.forEach(docSnap => {
      const data = docSnap.data() as Friendship;
      const otherEmail = data.participants.find((p: string) => p !== email);
      if (!otherEmail) return;

      const balanceKey = normalizeEmail(email);
      const balance = data.balances[balanceKey] || 0;
      if (balance < 0) totalOwe += Math.abs(balance);
      else totalOwed += balance;

      friends.push({
        id: docSnap.id,
        name: data.names[otherEmail] || "Friend",
        email: otherEmail,
        linkedUserId: data.uids.find((u: string) => u !== currentUserId) || null,
        mirrorFriendDocId: null,
        totalBalance: balance,
        createdAt: data.createdAt,
      });
    });

    return { friends, totalOwe, totalOwed };
  } catch (err) {
    console.error("[getFriendships] Failed:", err);
    return { friends: [], totalOwe: 0, totalOwed: 0 };
  }
}

/**
 * Adds a new shared friendship.
 */
export async function addGhostFriend(
  currentUserId: string, 
  name: string, 
  email?: string,
  currentUserName?: string,
  currentUserEmail?: string
): Promise<Friend> {
  const searchEmail = email?.trim().toLowerCase() || null;
  if (!searchEmail || !currentUserEmail) {
    throw new Error("Both emails are required for the Shared Ledger architecture.");
  }

  const friendshipId = getFriendshipId(currentUserEmail, searchEmail);
  const friendshipRef = doc(db, "friendships", friendshipId);

  let linkedUserId: string | null = null;
  try {
    const emailQuery = query(collection(db, "users"), where("email", "==", searchEmail), limit(1));
    const emailSnapshot = await getDocs(emailQuery);
    if (!emailSnapshot.empty) {
      linkedUserId = emailSnapshot.docs[0].id;
    }
  } catch (err) {
    console.warn("[linked lookup fail]", err);
  }

  const uids = [currentUserId];
  if (linkedUserId) uids.push(linkedUserId);

  await setDoc(friendshipRef, {
    participants: [currentUserEmail.toLowerCase(), searchEmail],
    uids,
    names: {
      [currentUserEmail.toLowerCase()]: currentUserName || "Someone",
      [searchEmail]: name,
    },
    balances: {
      [normalizeEmail(currentUserEmail)]: 0,
      [normalizeEmail(searchEmail)]: 0,
    },
    lastUpdated: serverTimestamp(),
    createdAt: serverTimestamp(),
  }, { merge: true });

  return {
    id: friendshipId,
    name,
    email: searchEmail,
    linkedUserId,
    mirrorFriendDocId: null,
    totalBalance: 0,
    createdAt: new Date(),
  };
}

/** Legacy support - can be removed once migration is complete */
export async function getUserFriends(userId: string): Promise<Friend[]> {
  return [];
}
