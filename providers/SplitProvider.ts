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
  getDocs
} from "firebase/firestore";

export interface PeerSplitData {
  title: string;
  totalAmount: number;
  payerId: string;
  friendId: string;
  /** Real UID of a registered friend (if they have an account) */
  linkedFriendId?: string;
  /** Doc ID in the linked friend's friends sub-collection pointing back to the current user */
  mirrorFriendDocId?: string;
}

export interface SplitDocument extends PeerSplitData {
  id: string;
  date: any;
  splitDetails: Record<string, number>;
  type?: "expense" | "settlement";
}

/**
 * Executes a 1-on-1 bill split using a Firestore Batch.
 * If the friend is a registered user (linkedFriendId + mirrorFriendDocId provided),
 * also updates their mirror balance so they can see what they owe.
 */
export async function createPeerSplit(currentUserId: string, splitData: PeerSplitData): Promise<void> {
  const batch = writeBatch(db);
  try {
    const splitAmount = parseFloat((splitData.totalAmount / 2).toFixed(2));

    // Build participants — include real UID if available for cross-account querying
    const participants = [currentUserId, splitData.friendId];
    if (splitData.linkedFriendId && !participants.includes(splitData.linkedFriendId)) {
      participants.push(splitData.linkedFriendId);
    }

    const newSplitDoc = doc(collection(db, "splits"));
    batch.set(newSplitDoc, {
      title: splitData.title.trim(),
      totalAmount: splitData.totalAmount,
      payerId: currentUserId,
      participants,
      splitDetails: { [splitData.friendId]: splitAmount },
      type: "expense",
      date: serverTimestamp(),
    });

    // Update User A's ghost friend balance (friend owes A)
    const friendRef = doc(db, "users", currentUserId, "friends", splitData.friendId);
    batch.update(friendRef, { totalBalance: increment(splitAmount) });

    // If friend is a registered user, mirror the debt on their side (they owe A)
    if (splitData.linkedFriendId && splitData.mirrorFriendDocId) {
      const mirrorRef = doc(
        db, "users", splitData.linkedFriendId, "friends", splitData.mirrorFriendDocId
      );
      batch.update(mirrorRef, { totalBalance: increment(-splitAmount) });
    }

    await batch.commit();
  } catch (error) {
    console.error("[error executing peer split] ==>", error);
    throw error;
  }
}

/**
 * Atomically settles all debts between the current user and a Ghost friend.
 * If the friend is registered, resets both sides of the ledger to 0.
 */
export async function settleUp(
  currentUserId: string,
  friendId: string,
  settleAmount: number,
  linkedFriendId?: string,
  mirrorFriendDocId?: string
): Promise<void> {
  const batch = writeBatch(db);
  try {
    // Log the settlement in the global splits ledger
    const settlementDoc = doc(collection(db, "splits"));
    const participants = [currentUserId, friendId];
    if (linkedFriendId && !participants.includes(linkedFriendId)) {
      participants.push(linkedFriendId);
    }

    batch.set(settlementDoc, {
      title: "Settled Up",
      totalAmount: settleAmount,
      payerId: currentUserId,
      participants,
      splitDetails: { [friendId]: 0 },
      type: "settlement",
      date: serverTimestamp(),
    });

    // Reset current user's ghost friend balance to 0
    const friendRef = doc(db, "users", currentUserId, "friends", friendId);
    batch.update(friendRef, { totalBalance: 0 });

    // If registered user, reset their mirror balance too
    if (linkedFriendId && mirrorFriendDocId) {
      const mirrorRef = doc(db, "users", linkedFriendId, "friends", mirrorFriendDocId);
      batch.update(mirrorRef, { totalBalance: 0 });
    }

    await batch.commit();
  } catch (error) {
    console.error("[error settling up] ==>", error);
    throw error;
  }
}

/**
 * Retrieves the most recent splits for the current user.
 * Sorting is done locally to avoid requiring a Firestore composite index.
 */
export async function getUserSplits(userId: string, limitCount: number = 5): Promise<SplitDocument[]> {
  try {
    const q = query(
      collection(db, "splits"),
      where("participants", "array-contains", userId),
      limit(50)
    );
    const querySnapshot = await getDocs(q);
    const splits: SplitDocument[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      splits.push({
        id: docSnap.id,
        title: data.title,
        totalAmount: data.totalAmount,
        payerId: data.payerId,
        friendId: data.participants?.find((p: string) => p !== userId) || "",
        splitDetails: data.splitDetails || {},
        date: data.date,
        type: data.type || "expense",
      });
    });

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
