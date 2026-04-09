import { Share, Platform } from "react-native";

const APP_LINK = process.env.EXPO_PUBLIC_APP_LINK || "https://settlr-d5d21.web.app";

/**
 * Utility to trigger the native system share sheet.
 */
export async function shareAppInvite(inviterName: string) {
  const message = `Join me on Settlr! I'm using it to track shared expenses and settle up effortlessly. Check it out: ${APP_LINK}`;
  
  try {
    await Share.share({
      title: "Join Settlr",
      message: message,
      url: APP_LINK, // iOS only
    });
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      console.error("[ShareService] Failed to share app invite:", error);
    }
  }
}

export async function shareGroupInvite(inviterName: string, groupName: string) {
  const message = `I've added you to the group "${groupName}" on Settlr! You can now view shared expenses and balances here: ${APP_LINK}`;
  
  try {
    await Share.share({
      title: `Added to ${groupName}`,
      message: message,
      url: APP_LINK,
    });
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      console.error("[ShareService] Failed to share group invite:", error);
    }
  }
}

export async function shareExpenseInvite(inviterName: string, title: string, amount: string) {
  const message = `I added a new expense for "${title}" on Settlr. You owe ${amount}. Settle up here: ${APP_LINK}`;
  
  try {
    await Share.share({
      title: "New Settlr Expense",
      message: message,
      url: APP_LINK,
    });
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      console.error("[ShareService] Failed to share expense invite:", error);
    }
  }
}
