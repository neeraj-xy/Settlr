import { db } from "@/config/firebaseConfig";
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  orderBy, 
  serverTimestamp,
  updateDoc,
  deleteDoc
} from "firebase/firestore";

export interface Friend {
  id: string; // The Firestore document ID
  name: string;
  email?: string;
  linkedUserId?: string | null;
  totalBalance: number;
  createdAt: any;
}

/**
 * Adds a new "Ghost" Friend to the current user's connections.
 * This does not require the friend to have an account yet.
 * 
 * @param currentUserId The UUID of the logged-in user
 * @param name The display name of the friend
 * @param email An optional email address to invite or link them later
 */
export async function addGhostFriend(currentUserId: string, name: string, email?: string): Promise<Friend> {
  try {
    const friendsRef = collection(db, "users", currentUserId, "friends");
    const newFriendDoc = doc(friendsRef); // Auto-generate ID

    const friendData = {
      name: name.trim(),
      email: email ? email.trim() : null,
      linkedUserId: null,
      totalBalance: 0,
      createdAt: serverTimestamp(),
    };

    await setDoc(newFriendDoc, friendData);

    return {
      id: newFriendDoc.id,
      ...friendData
    } as Friend;
  } catch (error) {
    console.error("[error adding ghost friend] ==>", error);
    throw error;
  }
}

/**
 * Retrieves all connected friends for the current user.
 * 
 * @param currentUserId The UUID of the logged-in user
 */
export async function getUserFriends(currentUserId: string): Promise<Friend[]> {
  try {
    const friendsRef = collection(db, "users", currentUserId, "friends");
    // Order by name or creation date for predictable UI arrays
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
