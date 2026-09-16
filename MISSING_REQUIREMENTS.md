# MISSING_REQUIREMENTS

## 1. Map/Location Integration
- **Requirement:** Customer Manual address entry / Map location integration readiness
- **Current status:** Partially Working
- **Existing implementation:** The data model (`Customer` in `dairy-store.ts`) supports `latitude` and `longitude` optional fields, and an `address` string field exists.
- **Missing part:** There is no UI Map picker or Google Maps SDK integration for pinning locations.
- **Required change:** Integrate `react-native-maps` and add a map pin screen during customer creation/editing.
- **Affected screen:** Customer Creation / Edit Form
- **Affected field:** Address / Location coordinates
- **Priority:** P2

## 2. Background OS Notifications
- **Requirement:** Notifications for Cow Reminders and Feed/Payment Reminders
- **Current status:** Partially Working
- **Existing implementation:** Logic is fully implemented in the store (`remindersSent`, `inAppNotifications`). In-app UI surfaces these alerts.
- **Missing part:** Actual background OS-level Push Notifications (via Expo Push or Local Notifications like `expo-notifications`).
- **Required change:** Setup `expo-notifications` for scheduling local reminders or integrate push tokens if backend is added.
- **Affected screen:** Global / App wrapper
- **Affected field:** Background Tasks / Notification Handlers
- **Priority:** P1

## 3. PDF Invoice / Rich Share Bill
- **Requirement:** Invoice/details view, Share bill, WhatsApp sharing, Correct customer information in invoice.
- **Current status:** Needs Improvement
- **Existing implementation:** Text-based sharing logic exists via React Native Share API.
- **Missing part:** High-quality PDF generated invoice is not verified; only basic sharing functionality is confirmed.
- **Required change:** Implement `expo-print` or a PDF library to generate a formal Invoice document before sharing.
- **Affected screen:** Billing / Invoice View
- **Affected field:** Share action
- **Priority:** P2

## 4. Accessibility Testing & Fine-Tuning
- **Requirement:** VoiceOver / TalkBack / Accessibility (Manual font-size control, contrast, screen reader)
- **Current status:** Needs Improvement
- **Existing implementation:** General semantic markup is present; React Native standard views are used. Font size setting is available in the store (`fontSize` in `Settings`).
- **Missing part:** Explicitly defined `accessibilityRole`, `accessibilityLabel`, and screen reader optimizations on custom Glass components.
- **Required change:** Comprehensive accessibility audit on device; add semantic labels to all icon buttons and custom UI elements.
- **Affected screen:** All screens
- **Affected field:** UI Components
- **Priority:** P1
