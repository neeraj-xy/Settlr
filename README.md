# Settlr 🌕📗

**Settle Up. Done.** — The modern, frictionless shared ledger for the social era.

Settlr simplifies splitting bills and tracking shared expenses for roommates, friends, and group trips. Built with a premium Emerald Green identity and powered by a high-performance Shared Ledger architecture.

## ✨ Features

### 🕊️ Free Social Outreach

Invitations and notifications are handled via the **Native System Share Sheet**.

- **Cost-Free Connectivity**: No paid email extensions or backend fees required.
- **Trusted Delivery**: Send invites via WhatsApp, Telegram, iMessage, or Email directly from your device.

### 📊 Hybrid Ledger System

Track expenses even with friends who haven't joined the app yet.

- **Shared Ledgers**: Automatic balance syncing between registered Settlr users.
- **Personal Ledgers (Ghost Users)**: Create offline profiles to track manual debts; Settlr masks technical IDs with professional "Ghost User" labels for a seamless UI.

### 🤝 Strategic Settlement

- **Handshake Protocol**: Settle debts with a single tap using context-aware settlement requests.
- **Real-Time Activity**: A live, platform-native activity feed documenting every lend, borrow, and settlement.

### 🎨 Modern Aesthetic

- **Premium Branding**: A high-end Emerald Green and Gold visual identity.
- **Adaptive UX**: Full light/dark mode support with branded startup animations and glassmorphic UI elements.

## 🛠️ Tech Stack

- **Framework**: [Expo](https://expo.dev/) (React Native)
- **Backend/Database**: [Firebase Firestore](https://firebase.google.com/)
- **Authentication**: Firebase Auth
- **UI Components**: [React Native Paper](https://reactnativepaper.com/) (MD3)
- **Styling**: Standard React Native StyleSheet with custom theme tokens
- **Intelligence**: Integrated with Google Gemini for future expense categorization

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) or Node.js installed
- Expo Go app on your mobile device (optional)

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   bun install
   ```

3. Create a `.env.local` file with your Firebase and Expo credentials:

   ```env
   EXPO_PUBLIC_APP_LINK="https://your-app-url.web.app"
   EXPO_PUBLIC_GEMINI_API_KEY="your-api-key"
   ```

4. Start the development server:

   ```bash
   bun start
   ```

## 🛰️ Deployment

Settlr is currently optimized for Web and Mobile deployment via Firebase Hosting.

```bash
# Build personal and web production assets
npx expo export --platform web

# Deploy to Firebase
firebase deploy --only hosting
```

---
*Settlr — because keeping track of money should be as smooth as spending it.* 🥂
