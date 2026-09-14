import { Stack } from "expo-router";
import "../../global.css";
import { ThemeProvider } from "../context/theme-context";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="delivery" />
        <Stack.Screen name="billing" />
        <Stack.Screen name="reports" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="customers" />
      </Stack>
    </ThemeProvider>
  );
}
