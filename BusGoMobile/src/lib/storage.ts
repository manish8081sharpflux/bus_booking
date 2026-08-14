import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN = 'busgo_customer_access_token';
const USER = 'busgo_customer_user';

export async function saveSession(token: string, user: unknown) {
  await SecureStore.setItemAsync(ACCESS_TOKEN, token);
  await SecureStore.setItemAsync(USER, JSON.stringify(user ?? null));
}
export async function readToken() { return SecureStore.getItemAsync(ACCESS_TOKEN); }
export async function readUser<T = unknown>(): Promise<T | null> {
  const raw = await SecureStore.getItemAsync(USER);
  return raw ? JSON.parse(raw) as T : null;
}
export async function clearSession() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(USER);
}
