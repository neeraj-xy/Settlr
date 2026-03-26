import { db } from "@/config/firebaseConfig";
import { 
  collection, 
  doc,
  writeBatch,
  serverTimestamp,
  increment,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from "firebase/firestore";

export interface PeerSplitData {
  title: string;
  totalAmount: number;
  payerId: string;
  friendId: string; // The Ghost friend's ID
}

/**
 * Executes a 1-on-1 bill split using a Firestore Batch.
 * Defaults to "Paid By User, Split Equally".
 * 
 * @param currentUserId The UUID of the logged-in user paying the bill
 * @param splitData The transaction metadata
 */
export async function createPeerSplit(currentUserId: string, splitData: PeerSplitData): Promise<void> {
  const batch = writeBatch(db);

  try {
    // 1. Calculate the exact split math
    // Assuming 50/50 split for peer-to-peer. The friend owes half the total.
    const splitAmount = parseFloat((splitData.totalAmount / 2).toFixed(2));

    // 2. Prep the Global Transaction Log Document
    const splitsRef = collection(db, "splits");
    const newSplitDoc = doc(splitsRef);

    batch.set(newSplitDoc, {
      title: splitData.title.trim(),
      totalAmount: splitData.totalAmount,
      payerId: currentUserId,
      participants: [currentUserId, splitData.friendId],
      splitDetails: {
        [splitData.friendId]: splitAmount, // Friend owes this much
      },
      date: serverTimestamp(),
    });

    // 3. Prep the Offline Ghost Friend Balance Update
    // We atomically increment their totalBalance by the split chunk they owe us.
    const friendRef = doc(db, "users", currentUserId, "friends", splitData.friendId);
    batch.update(friendRef, {
      totalBalance: increment(splitAmount)
    });

    // 4. Commit the indestructible pair to Firestore
    await batch.commit();

  } catch (error) {
    console.error("[error executing peer split] ==>", error);
    throw error;
  }
}

export interface SplitDocument extends PeerSplitData {
  id: string;
  date: any;
  splitDetails: Record<string, number>;
}

/**
 * Retrieves the most recent splits for the current user.
 * We omit orderBy in the Firestore query to organically prevent composite index requirements, 
 * and execute the sorting locally to guarantee the feed populates out of the box for the user.
 */
export async function getUserSplits(userId: string, limitCount: number = 5): Promise<SplitDocument[]> {
  try {
    const splitsRef = collection(db, "splits");
    const q = query(
      splitsRef,
      where("participants", "array-contains", userId),
      limit(50) // Local aggregation buffer
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
      });
    });

    // 2. Perform the chronological Sort entirely in Javascript memory to bypass the Firebase Error
    splits.sort((a, b) => {
      const timeA = a.date?.toMillis ? a.date.toMillis() : Date.now();
      const timeB = b.date?.toMillis ? b.date.toMillis() : Date.now();
      return timeB - timeA;
    });

    // 3. Slice the exact limit the UI requested
    return splits.slice(0, limitCount);
  } catch (error: any) {
    console.error("[error fetching user splits] ==>", error);
    return [];
  }
}
