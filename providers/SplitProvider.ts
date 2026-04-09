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
  orderBy,
  startAfter,
  getDocs,
  setDoc,
  updateDoc,
  getDoc,
  deleteDoc
} from "firebase/firestore";
import { getFriendshipId, normalizeEmail } from "./FriendProvider";
import { GroupMember } from "./GroupProvider";

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
  status?: "pending" | "completed" | "deleted";
  /** The exact calculated amount the friend owes in this split */
  friendShareAmount?: number;
}

export interface GroupSplitData {
  groupId: string;
  title: string;
  totalAmount: number;
  payerEmail: string;
  payerName: string;
  /** map of user email to the amount they owe in this split */
  splitDetails: Record<string, number>;
  participants: GroupMember[];
}

export interface SplitDocument extends PeerSplitData {
  id: string;
  date: any;
  splitDetails: Record<string, number>;
  participants: string[];
  type?: "expense" | "settlement";
  groupId?: string;
  status?: "pending" | "completed" | "deleted";
}

/**
 * Executes a group split across multiple participants.
 */
export async function createGroupSplit(creatorId: string, data: GroupSplitData): Promise<void> {
  const batch = writeBatch(db);
  try {
    const splitDocRef = doc(collection(db, "splits"));
    const groupRef = doc(db, "groups", data.groupId);
    const payerEmailKey = normalizeEmail(data.payerEmail);

    // 1. Prepare Split Document
    const participants = data.participants.map(p => `email:${p.email.toLowerCase().trim()}`);
    if (!participants.includes(`email:${data.payerEmail.toLowerCase().trim()}`)) {
       participants.push(`email:${data.payerEmail.toLowerCase().trim()}`);
    }

    batch.set(splitDocRef, {
      groupId: data.groupId,
      title: data.title.trim(),
      totalAmount: data.totalAmount,
      payerId: creatorId,
      payerName: data.payerName,
      payerEmail: data.payerEmail,
      participants,
      splitDetails: data.splitDetails,
      type: "expense",
      date: serverTimestamp(),
      status: "completed",
    });

    // 2. Update Group Net Balances
    // For the payer: balance increases by (totalAmount - their_own_share)
    // For each participant: balance decreases by their_share
    const payerShare = data.splitDetails[data.payerEmail] || 0;
    const totalOthersOwe = data.totalAmount - payerShare;

    batch.update(groupRef, {
      [`balances.${payerEmailKey}`]: increment(totalOthersOwe),
      [`grossBalances.${payerEmailKey}.owed`]: increment(totalOthersOwe),
      lastUpdated: serverTimestamp(),
    });

    // 3. Update Individual Participants & Friendship Ledgers
    for (const [email, amount] of Object.entries(data.splitDetails)) {
      if (email === data.payerEmail) continue;

      const memberEmailKey = normalizeEmail(email);
      
      // Update member's net balance in the group
      batch.update(groupRef, {
        [`balances.${memberEmailKey}`]: increment(-amount),
        [`grossBalances.${memberEmailKey}.owe`]: increment(amount),
        lastUpdated: serverTimestamp(),
      });

      // Update the 1-on-1 friendship ledger to reflect aggregate debt
      const friendshipId = getFriendshipId(data.payerEmail, email);
      const friendshipRef = doc(db, "friendships", friendshipId);
      
      batch.update(friendshipRef, {
        [`balances.${payerEmailKey}`]: increment(amount),
        [`balances.${memberEmailKey}`]: increment(-amount),
        [`grossBalances.${payerEmailKey}.owed`]: increment(amount),
        [`grossBalances.${memberEmailKey}.owe`]: increment(amount),
        lastUpdated: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    console.error("[error executing group split] ==>", error);
    throw error;
  }
}

/**
 * Executes a 1-on-1 bill split using a Firestore Batch.
 */
export async function createPeerSplit(currentUserId: string, splitData: PeerSplitData): Promise<void> {
  const batch = writeBatch(db);
  try {
    const splitAmount = splitData.friendShareAmount !== undefined 
      ? parseFloat(splitData.friendShareAmount.toFixed(2))
      : parseFloat((splitData.totalAmount / 2).toFixed(2));

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
      // NEW: Log Gross Owed/Owe breakdown
      [`grossBalances.${normalizeEmail(splitData.payerEmail!)}.owed`]: increment(splitAmount),
      [`grossBalances.${normalizeEmail(splitData.friendEmail!)}.owe`]: increment(splitAmount),
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
  isAcknowledgeReceipt?: boolean,
  contextTitle?: string,
  groupId?: string
): Promise<void> {
  const batch = writeBatch(db);
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
    const status = "completed";

    batch.set(settlementDoc, {
      title: contextTitle ? `Settled: ${contextTitle}` : "Settled Up",
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
      factor: isAcknowledgeReceipt ? -1 : 1,
      groupId: groupId || null,
    });

    const factor = isAcknowledgeReceipt ? -1 : 1;
    const friendshipId = getFriendshipId(payerEmail!, friendEmail!);
    const friendshipRef = doc(db, "friendships", friendshipId);

    batch.update(friendshipRef, {
      [`balances.${normalizeEmail(payerEmail!)}`]: increment(settleAmount * factor),
      [`balances.${normalizeEmail(friendEmail!)}`]: increment(-settleAmount * factor),
      [`grossBalances.${normalizeEmail(payerEmail!)}.owe`]: increment(factor === 1 ? -settleAmount : 0),
      [`grossBalances.${normalizeEmail(payerEmail!)}.owed`]: increment(factor === -1 ? -settleAmount : 0),
      [`grossBalances.${normalizeEmail(friendEmail!)}.owe`]: increment(factor === -1 ? -settleAmount : 0),
      [`grossBalances.${normalizeEmail(friendEmail!)}.owed`]: increment(factor === 1 ? -settleAmount : 0),
      lastUpdated: serverTimestamp(),
    });

    if (groupId) {
      const groupRef = doc(db, "groups", groupId);
      const payerEmailKey = normalizeEmail(payerEmail!);
      const friendEmailKey = normalizeEmail(friendEmail!);

      batch.update(groupRef, {
        [`balances.${payerEmailKey}`]: increment(settleAmount * factor),
        [`balances.${friendEmailKey}`]: increment(-settleAmount * factor),
        [`grossBalances.${payerEmailKey}.owe`]: increment(factor === 1 ? -settleAmount : 0),
        [`grossBalances.${payerEmailKey}.owed`]: increment(factor === -1 ? -settleAmount : 0),
        [`grossBalances.${friendEmailKey}.owe`]: increment(factor === -1 ? -settleAmount : 0),
        [`grossBalances.${friendEmailKey}.owed`]: increment(factor === 1 ? -settleAmount : 0),
        lastUpdated: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    console.error("[error settling up] ==>", error);
    throw error;
  }
}


/**
 * Deletes a split and reverses its continuous ledger metrics safely.
 */
export async function deleteSplit(splitId: string): Promise<void> {
  const batch = writeBatch(db);
  try {
    const splitRef = doc(db, "splits", splitId);
    const snap = await getDoc(splitRef);
    if (!snap.exists()) return;

    const data = snap.data();
    if (data.status === "deleted") {
      console.warn("Attempted to delete an already deleted split!");
      return;
    }

    // Reverse ledger for completed splits
    if (data.status === "completed") {
      const splitAmount = Object.values(data.splitDetails || {}).reduce((sum: number, val) => sum + (Number(val) || 0), 0) as number;

      // Handle 1-on-1 direct splits (Legacy/Peer)
      if (data.payerEmail && data.friendEmail && !data.groupId) {
        const friendshipId = getFriendshipId(data.payerEmail, data.friendEmail);
        const friendshipRef = doc(db, "friendships", friendshipId);

        if (data.type === "expense") {
          batch.update(friendshipRef, {
            [`balances.${normalizeEmail(data.payerEmail)}`]: increment(-splitAmount),
            [`balances.${normalizeEmail(data.friendEmail)}`]: increment(splitAmount),
            [`grossBalances.${normalizeEmail(data.payerEmail)}.owed`]: increment(-splitAmount),
            [`grossBalances.${normalizeEmail(data.friendEmail)}.owe`]: increment(-splitAmount),
            lastUpdated: serverTimestamp(),
          });
        } else if (data.type === "settlement") {
          const factor = data.factor || 1;
          batch.update(friendshipRef, {
            [`balances.${normalizeEmail(data.payerEmail)}`]: increment(-splitAmount * factor),
            [`balances.${normalizeEmail(data.friendEmail)}`]: increment(splitAmount * factor),
            [`grossBalances.${normalizeEmail(data.payerEmail)}.owe`]: increment(factor === 1 ? splitAmount : 0),
            [`grossBalances.${normalizeEmail(data.payerEmail)}.owed`]: increment(factor === -1 ? splitAmount : 0),
            [`grossBalances.${normalizeEmail(data.friendEmail)}.owe`]: increment(factor === -1 ? splitAmount : 0),
            [`grossBalances.${normalizeEmail(data.friendEmail)}.owed`]: increment(factor === 1 ? splitAmount : 0),
            lastUpdated: serverTimestamp(),
          });
        }
      }

      // Handle Group Reversals
      if (data.groupId) {
        const groupRef = doc(db, "groups", data.groupId);
        const payerEmailKey = normalizeEmail(data.payerEmail);

        if (data.type === "expense") {
          // Reverse group ledger for multi-person expense
          const payerShare = data.splitDetails[data.payerEmail] || 0;
          const othersOwedToPayer = data.totalAmount - payerShare;

          batch.update(groupRef, {
             [`balances.${payerEmailKey}`]: increment(-othersOwedToPayer),
             [`grossBalances.${payerEmailKey}.owed`]: increment(-othersOwedToPayer),
          });

          for (const [email, amountVal] of Object.entries(data.splitDetails)) {
            if (email === data.payerEmail) continue;
            const amount = amountVal as number;
            const mKey = normalizeEmail(email);
            batch.update(groupRef, {
              [`balances.${mKey}`]: increment(amount),
              [`grossBalances.${mKey}.owe`]: increment(-amount),
            });
            
            // Mirror reverse in friendships for EVERY person
            const friendshipId = getFriendshipId(data.payerEmail, email);
            const friendshipRef = doc(db, "friendships", friendshipId);
            batch.update(friendshipRef, {
              [`balances.${payerEmailKey}`]: increment(-amount),
              [`balances.${mKey}`]: increment(amount),
              [`grossBalances.${payerEmailKey}.owed`]: increment(-amount),
              [`grossBalances.${mKey}.owe`]: increment(-amount),
            });
          }
        } else if (data.type === "settlement") {
          const factor = data.factor || 1;
          const friendEmailKey = normalizeEmail(data.friendEmail);
          
          batch.update(groupRef, {
            [`balances.${payerEmailKey}`]: increment(-splitAmount * factor),
            [`balances.${friendEmailKey}`]: increment(splitAmount * factor),
            [`grossBalances.${payerEmailKey}.owe`]: increment(factor === 1 ? splitAmount : 0),
            [`grossBalances.${payerEmailKey}.owed`]: increment(factor === -1 ? splitAmount : 0),
            [`grossBalances.${friendEmailKey}.owe`]: increment(factor === -1 ? splitAmount : 0),
            [`grossBalances.${friendEmailKey}.owed`]: increment(factor === 1 ? splitAmount : 0),
          });

          // Also reverse friendship ledger for settlement
          const friendshipId = getFriendshipId(data.payerEmail, data.friendEmail);
          const friendshipRef = doc(db, "friendships", friendshipId);
          batch.update(friendshipRef, {
            [`balances.${payerEmailKey}`]: increment(-splitAmount * factor),
            [`balances.${friendEmailKey}`]: increment(splitAmount * factor),
            [`grossBalances.${payerEmailKey}.owe`]: increment(factor === 1 ? splitAmount : 0),
            [`grossBalances.${payerEmailKey}.owed`]: increment(factor === -1 ? splitAmount : 0),
            [`grossBalances.${friendEmailKey}.owe`]: increment(factor === -1 ? splitAmount : 0),
            [`grossBalances.${friendEmailKey}.owed`]: increment(factor === 1 ? splitAmount : 0),
          });
        }
      }
    }

    batch.update(splitRef, {
      status: "deleted",
      deletedAt: serverTimestamp()
    });
    await batch.commit();
    console.log("[DEBUG] Split safely soft-deleted and reversed.");
  } catch (error) {
    console.error("[error deleting split] ==>", error);
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
  limitCount: number = 10,
  lastVisible?: any
): Promise<SplitDocument[]> {
  try {
    const searchTerms: string[] = [userId];
    const emailTag = userEmail?.trim() ? `email:${userEmail.trim().toLowerCase()}` : null;
    if (emailTag) searchTerms.push(emailTag);

    // PHASE 1: Fetch splits where I am explicitly listed as a participant
    let directQuery = query(
      collection(db, "splits"),
      where("participants", "array-contains-any", searchTerms),
      orderBy("date", "desc"),
      limit(limitCount + 10)
    );
    
    if (lastVisible) {
      directQuery = query(directQuery, startAfter(lastVisible));
    }
    
    const directSnap = await getDocs(directQuery);
    
    // PHASE 2: Fetch splits where my linked friends are the payer (The 'Rescue')
    const linkedFriends = (manualFriends || []).filter(f => f.linkedUserId);
    const rescuePromises = linkedFriends.map(f => {
      let q = query(
        collection(db, "splits"), 
        where("payerId", "==", f.linkedUserId), 
        orderBy("date", "desc"), 
        limit(limitCount + 10)
      );
      if (lastVisible) q = query(q, startAfter(lastVisible));
      return getDocs(q);
    });
    const rescueSnaps = await Promise.all(rescuePromises);
    
    // Merge and deduplicate
    const allDocsMap: Record<string, SplitDocument> = {};
    
    directSnap.docs.forEach(docSnap => {
      allDocsMap[docSnap.id] = { id: docSnap.id, ...docSnap.data() } as SplitDocument;
    });
    
    rescueSnaps.forEach(snap => {
      snap.docs.forEach(docSnap => {
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
      const timeA = a.date?.toMillis ? a.date.toMillis() : (a.date instanceof Date ? a.date.getTime() : Date.now());
      const timeB = b.date?.toMillis ? b.date.toMillis() : (b.date instanceof Date ? b.date.getTime() : Date.now());
      return timeB - timeA;
    });

    return splits.slice(0, limitCount);
  } catch (error: any) {
    console.error("[error fetching user splits] ==>", error);
    return [];
  }
}
