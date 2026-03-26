import { db } from "@/config/firebaseConfig";
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc,
  query, 
  orderBy, 
  serverTimestamp,
  updateDoc,
  deleteDoc,
  where,
  limit
} from "firebase/firestore";

export interface Friend {
  id: string; // The Firestore document ID
  name: string;
  email?: string;
  linkedUserId?: string | null;
  mirrorFriendDocId?: string | null; // Doc ID in linkedUser's friends collection pointing back to current user
  totalBalance: number;
  createdAt: any;
}

/**
 * Adds a new "Ghost" Friend to the current user's connections.
 * If the friend's email belongs to a registered user, links them bidirectionally
 * so both parties can see their balances.
 */
export async function addGhostFriend(currentUserId: string, name: string, email?: string): Promise<Friend> {
  try {
    const friendsRef = collection(db, "users", currentUserId, "friends");
    const newFriendDoc = doc(friendsRef);

    let linkedUserId: string | null = null;
    let mirrorFriendDocId: string | null = null;

    // If email supplied, try to find a registered user with that email
    if (email?.trim()) {
      const usersRef = collection(db, "users");
      const emailQuery = query(usersRef, where("email", "==", email.trim()), limit(1));
      const emailSnapshot = await getDocs(emailQuery);

      if (!emailSnapshot.empty) {
        linkedUserId = emailSnapshot.docs[0].id;

        // Avoid linking to yourself
        if (linkedUserId !== currentUserId) {
          // Check if the linked user already has a mirror entry for current user
          const mirrorFriendsRef = collection(db, "users", linkedUserId, "friends");
          const mirrorQuery = query(
            mirrorFriendsRef,
            where("linkedUserId", "==", currentUserId),
            limit(1)
          );
          const mirrorSnapshot = await getDocs(mirrorQuery);

          if (!mirrorSnapshot.empty) {
            // Reuse existing mirror
            mirrorFriendDocId = mirrorSnapshot.docs[0].id;
          } else {
            // Create a new mirror ghost friend under the linked user's account
            const mirrorDoc = doc(mirrorFriendsRef);
            mirrorFriendDocId = mirrorDoc.id;

            // Fetch current user's display name for the mirror entry
            const currentUserSnap = await getDoc(doc(db, "users", currentUserId));
            const currentUserName = currentUserSnap.data()?.displayName || name;

            await setDoc(mirrorDoc, {
              name: currentUserName,
              email: null,
              linkedUserId: currentUserId,
              mirrorFriendDocId: newFriendDoc.id, // Points back to User A's ghost doc
              totalBalance: 0,
              createdAt: serverTimestamp(),
            });
          }
        } else {
          // Don't link to self
          linkedUserId = null;
        }
      }
    }

    const friendData = {
      name: name.trim(),
      email: email ? email.trim() : null,
      linkedUserId,
      mirrorFriendDocId,
      totalBalance: 0,
      createdAt: serverTimestamp(),
    };

    await setDoc(newFriendDoc, friendData);

    return { id: newFriendDoc.id, ...friendData } as Friend;
  } catch (error) {
    console.error("[error adding ghost friend] ==>", error);
    throw error;
  }
}

/**
 * Retrieves all connected friends for the current user.
 */
export async function getUserFriends(currentUserId: string): Promise<Friend[]> {
  try {
    const friendsRef = collection(db, "users", currentUserId, "friends");
    const q = query(friendsRef, orderBy("createdAt", "desc"));
    
    const querySnapshot = await getDocs(q);
    const friends: Friend[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      friends.push({
        id: docSnap.id,
        name: data.name,
        email: data.email,
        linkedUserId: data.linkedUserId,
        mirrorFriendDocId: data.mirrorFriendDocId,
        totalBalance: data.totalBalance || 0,
        createdAt: data.createdAt,
      });
    });

    return friends;
  } catch (error) {
    console.error("[error fetching user friends] ==>", error);
    throw error;
  }
}
