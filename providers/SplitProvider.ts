import { db } from "@/config/firebaseConfig";
import { 
  collection, 
  doc,
  writeBatch,
  serverTimestamp,
  increment,
  query,
  where,
  limit,
  getDocs,
  setDoc,
  updateDoc,
  getDoc,
  deleteDoc
} from "firebase/firestore";
import { getFriendshipId, normalizeEmail } from "./FriendProvider";

export interface PeerSplitData {
  title: string;
  totalAmount: number;
  payerId: string;
  payerName?: string;
  payerEmail?: string;
  friendId: string;
  friendName?: string;
  friendEmail?: string | null;
  /** Real UID of a registered friend (if they have an account) */
  linkedFriendId?: string;
  /** Doc ID in the linked friend's friends sub-collection pointing back to the current user */
  mirrorFriendDocId?: string;
  /** Dual-Confirmation status for settlements */
  status?: "pending" | "completed";
}

export interface SplitDocument extends PeerSplitData {
  id: string;
  date: any;
  splitDetails: Record<string, number>;
  participants: string[];
  type?: "expense" | "settlement";
}

/**
 * Executes a 1-on-1 bill split using a Firestore Batch.
 */
export async function createPeerSplit(currentUserId: string, splitData: PeerSplitData): Promise<void> {
  const batch = writeBatch(db);
  try {
    const splitAmount = parseFloat((splitData.totalAmount / 2).toFixed(2));

    const participants: string[] = [currentUserId, splitData.friendId];
    if (splitData.linkedFriendId && !participants.includes(splitData.linkedFriendId)) {
      participants.push(splitData.linkedFriendId);
    }
    if (splitData.friendEmail?.trim()) {
      const emailTag = `email:${splitData.friendEmail.trim().toLowerCase()}`;
      if (!participants.includes(emailTag)) participants.push(emailTag);
    }
    if (splitData.payerEmail?.trim()) {
      const emailTag = `email:${splitData.payerEmail.trim().toLowerCase()}`;
      if (!participants.includes(emailTag)) participants.push(emailTag);
    }

    const newSplitDoc = doc(collection(db, "splits"));
    const receiverKey = splitData.linkedFriendId || splitData.friendId;

    batch.set(newSplitDoc, {
      title: splitData.title.trim(),
      totalAmount: splitData.totalAmount,
      payerId: currentUserId,
      payerName: splitData.payerName || "Someone",
      payerEmail: splitData.payerEmail || null,
      friendId: splitData.friendId,
      friendName: splitData.friendName || "Friend",
      friendEmail: splitData.friendEmail || null,
      linkedFriendId: splitData.linkedFriendId || null,
      mirrorFriendDocId: splitData.mirrorFriendDocId || null,
      participants,
      splitDetails: { [receiverKey]: splitAmount },
      type: "expense",
      date: serverTimestamp(),
      status: "completed",
    });

    const friendshipId = getFriendshipId(splitData.payerEmail!, splitData.friendEmail!);
    const friendshipRef = doc(db, "friendships", friendshipId);

    // Update the shared friendship ledger
    batch.update(friendshipRef, {
      [`balances.${normalizeEmail(splitData.payerEmail!)}`]: increment(splitAmount),
      [`balances.${normalizeEmail(splitData.friendEmail!)}`]: increment(-splitAmount),
      lastUpdated: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    console.error("[error executing peer split] ==>", error);
    throw error;
  }
}

/**
 * Initiates a settlement. Status is 'pending' for registered users, 'completed' for ghosts.
 */
export async function settleUp(
  currentUserId: string,
  friendId: string,
  settleAmount: number,
  linkedFriendId?: string,
  mirrorFriendDocId?: string,
  friendEmail?: string | null,
  payerName?: string,
  payerEmail?: string,
  friendName?: string,
  isAcknowledgeReceipt?: boolean
): Promise<void> {
  try {
    const settlementDoc = doc(collection(db, "splits"));
    const participants: string[] = [currentUserId, friendId];
    if (linkedFriendId && !participants.includes(linkedFriendId)) {
      participants.push(linkedFriendId);
    }
    if (friendEmail?.trim()) {
      const emailTag = `email:${friendEmail.trim().toLowerCase()}`;
      if (!participants.includes(emailTag)) participants.push(emailTag);
    }
    if (payerEmail?.trim()) {
      const emailTag = `email:${payerEmail.trim().toLowerCase()}`;
      if (!participants.includes(emailTag)) participants.push(emailTag);
    }

    const receiverKey = linkedFriendId || friendId;
    const isGhost = !linkedFriendId;

    // Dual-Confirmation: Pending if receiver is a user (payer initiated), 
    // Completed if ghost or if the receiver is the one acknowledging (one-click).
    const status = (isGhost || isAcknowledgeReceipt) ? "completed" : "pending";

    await setDoc(settlementDoc, {
      title: status === "pending" ? "Settlement Request" : "Settled Up",
      totalAmount: settleAmount,
      payerId: currentUserId,
      payerName: payerName || "Someone",
      payerEmail: payerEmail || null,
      friendId: friendId,
      friendName: friendName || "Friend",
      linkedFriendId: linkedFriendId || null,
      participants,
      splitDetails: { [receiverKey]: settleAmount },
      type: "settlement",
      status, 
      date: serverTimestamp(),
      friendEmail: friendEmail || null,
    });

    // If completed instantly, zero out the shared ledger
    if (status === "completed") {
      const friendshipId = getFriendshipId(payerEmail!, friendEmail!);
      const friendshipRef = doc(db, "friendships", friendshipId);
      await updateDoc(friendshipRef, {
        [`balances.${normalizeEmail(payerEmail!)}`]: 0,
        [`balances.${normalizeEmail(friendEmail!)}`]: 0,
        lastUpdated: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("[error settling up] ==>", error);
    throw error;
  }
}

/**
 * Confirms a pending settlement, officially clearing the balance.
 */
export async function confirmSettlement(splitId: string, currentUserId: string): Promise<void> {
  const batch = writeBatch(db);
  try {
    const splitRef = doc(db, "splits", splitId);
    const snap = await getDoc(splitRef);
    if (!snap.exists()) return;

    const data = snap.data();
    if (data.type !== "settlement" || data.status !== "pending") return;

    // 1. Mark Settlement as Completed
    batch.update(splitRef, { 
      status: "completed",
      title: "Settled Up"
    });

    // 2. Zero out the shared friendship ledger
    const friendshipId = getFriendshipId(data.payerEmail, data.friendEmail);
    const friendshipRef = doc(db, "friendships", friendshipId);
    batch.update(friendshipRef, {
      [`balances.${normalizeEmail(data.payerEmail)}`]: 0,
      [`balances.${normalizeEmail(data.friendEmail)}`]: 0,
      lastUpdated: serverTimestamp(),
    });

    await batch.commit();
    console.log("[DEBUG] Settlement confirmed and shared ledger cleared!");
  } catch (error) {
    console.error("[error confirming settlement] ==>", error);
    throw error;
  }
}

/**
 * Cancels a pending settlement by deleting the record.
 */
export async function cancelSettlement(splitId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "splits", splitId));
    console.log("[DEBUG] Settlement canceled.");
  } catch (error) {
    console.error("[error canceling settlement] ==>", error);
    throw error;
  }
}

/**
 * Retrieves the most recent splits for the current user.
 * Uses 'Rescue' logic to find splits from linked friends where the user was a participant.
 */
export async function getUserSplits(
  userId: string, 
  manualFriends: any[], // Use any[] if Friend type not easily imported to avoid circularity
  userEmail?: string | null,
  limitCount: number = 5
): Promise<SplitDocument[]> {
  try {
    const searchTerms: string[] = [userId];
    const emailTag = userEmail?.trim() ? `email:${userEmail.trim().toLowerCase()}` : null;
    if (emailTag) searchTerms.push(emailTag);

    // PHASE 1: Fetch splits where I am explicitly listed as a participant
    const directQuery = query(
      collection(db, "splits"),
      where("participants", "array-contains-any", searchTerms),
      limit(50)
    );
    const directSnap = await getDocs(directQuery);
    
    // PHASE 2: Fetch splits where my linked friends are the payer (The 'Rescue')
    const linkedFriends = (manualFriends || []).filter(f => f.linkedUserId);
    const rescuePromises = linkedFriends.map(f => {
      return getDocs(query(collection(db, "splits"), where("payerId", "==", f.linkedUserId), limit(50)));
    });
    const rescueSnaps = await Promise.all(rescuePromises);
    
    // Merge and deduplicate
    const allDocsMap: Record<string, SplitDocument> = {};
    
    directSnap.docs.forEach(docSnap => {
      allDocsMap[docSnap.id] = { id: docSnap.id, ...docSnap.data() } as SplitDocument;
    });
    
    rescueSnaps.forEach(snap => {
      snap.docs.forEach(docSnap => {
        // Only include if NOT already in map AND the user is actually in this split as a Ghost
        if (!allDocsMap[docSnap.id]) {
          const data = docSnap.data();
          const payerId = data.payerId;
          const myFriendDocForPayer = manualFriends.find(f => f.linkedUserId === payerId);
          const possibleIds = [...searchTerms];
          if (myFriendDocForPayer) possibleIds.push(myFriendDocForPayer.id);
          
          if (data.participants?.some((p: string) => possibleIds.includes(p))) {
            allDocsMap[docSnap.id] = { id: docSnap.id, ...data } as SplitDocument;
          }
        }
      });
    });

    const splits = Object.values(allDocsMap);

    // Sort by date (descending)
    splits.sort((a, b) => {
      const timeA = a.date?.toMillis ? a.date.toMillis() : Date.now();
      const timeB = b.date?.toMillis ? b.date.toMillis() : Date.now();
      return timeB - timeA;
    });

    return splits.slice(0, limitCount);
  } catch (error: any) {
    console.error("[error fetching user splits] ==>", error);
    return [];
  }
}
