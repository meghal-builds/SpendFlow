# 💸 SpendFlow — Mobile Expense Tracker

<p align="center">
  <b>SpendFlow</b> is a modern, privacy-focused, 100% offline-first personal expense tracker built with <b>React Native</b>, <b>Expo SDK 57</b>, and <b>SQLite</b>.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Android%20%7C%20iOS%20%7C%20Web-blue?style=for-the-badge&logo=react" alt="Platform" />
  <img src="https://img.shields.io/badge/Framework-Expo%20v57-000000?style=for-the-badge&logo=expo" alt="Expo" />
  <img src="https://img.shields.io/badge/Language-TypeScript-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Database-SQLite-003B57?style=for-the-badge&logo=sqlite" alt="SQLite" />
  <img src="https://img.shields.io/badge/State-Zustand-orange?style=for-the-badge" alt="Zustand" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>

---

## ✨ Features

- 🔒 **100% Offline & Private** — All financial data is stored locally on your device in an embedded SQLite database. No accounts, cloud dependencies, or tracking.
- 📊 **Visual Analytics & Reports** — Dynamic Donut & Bar charts to visualize spending by category, week, month, and custom ranges.
- 💡 **Smart Budgeting & Alerts** — Set monthly spending limits with real-time budget progress indicators.
- 🔔 **Scheduled Local Notifications** — Stay on track with automated daily reminder alerts and weekly/monthly summary notifications.
- 📁 **Data Export & Backup** — Easily export your transaction history to CSV format for backup or external analysis.
- 🎨 **Adaptive Themes** — Smooth dark and light mode themes with glassmorphism visual aesthetics.
- 📱 **Cross-Platform Responsive** — Crafted for seamless performance across Android, iOS, and Web.

---

## 🛠️ Tech Stack & Architecture

- **Core Framework**: React Native (0.86) + Expo (v57) with Expo Router (File-based navigation)
- **Language**: TypeScript
- **Database Layer**: `expo-sqlite` with custom repository architecture
- **State Management**: `zustand`
- **UI Components & Charts**: `react-native-svg`, Custom HSL Theme System
- **Notifications**: `expo-notifications`
- **Build System**: Expo Application Services (EAS Build)

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Expo Go app on your mobile device (or Android Studio / Xcode for emulators)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/meghal-builds/SpendFlow.git
   cd SpendFlow
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the Expo development server**:
   ```bash
   npx expo start
   ```

4. **Run on your device**:
   - Scan the terminal QR code with your phone camera or the **Expo Go** app.
   - Or press `a` for Android Emulator, `i` for iOS Simulator, `w` for Web preview.

---

## 📱 Building Mobile Executables (EAS Build)

SpendFlow is pre-configured with `eas.json` for building native mobile binaries using EAS Build:

### Standalone Android APK (for direct installation & testing)
```bash
eas build --profile preview --platform android
```

### Production Android App Bundle (.aab for Google Play Store)
```bash
eas build --profile production --platform android
```

---

## 📂 Project Structure

```text
SpendFlow/
├── assets/                  # App icons, splash screens, and images
├── src/
│   ├── app/                 # Expo Router file-based pages & tab navigation
│   │   ├── (tabs)/          # Main tab screens (Home, History, Reports, Settings)
│   │   ├── add-expense.tsx  # Add new expense modal form
│   │   └── onboarding.tsx   # Initial user preference setup flow
│   ├── components/          # Reusable UI components & interactive charts
│   ├── database/            # SQLite schema, migrations, and repository layer
│   ├── hooks/               # Custom React hooks (theme, device hooks)
│   ├── services/            # Notifications, CSV export, and backup services
│   ├── store/               # Zustand global state management
│   ├── theme/               # Design system tokens (colors, typography, spacing)
│   ├── types/               # TypeScript interface definitions
│   └── utils/               # Date formatting and currency calculations
├── app.json                 # Expo configuration
├── eas.json                 # EAS build profiles (development, preview, production)
└── README.md                # Project documentation
```

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

<p align="center">
  Developed with ❤️ by <a href="https://github.com/meghal-builds">Meghal</a>
</p>
