import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/context/AuthContext';
import { colors } from '@/theme/colors';

export default function RootLayout(){
  return <SafeAreaProvider><AuthProvider><StatusBar style="dark"/><Stack screenOptions={{
    headerStyle:{backgroundColor:colors.surface},
    headerShadowVisible:false,
    headerTintColor:colors.text,
    headerBackTitle:'Back',
    headerTitleStyle:{fontWeight:'900'},
    contentStyle:{backgroundColor:colors.background},
    animation:'slide_from_right',
  }}>
    <Stack.Screen name="index" options={{headerShown:false}}/>
    <Stack.Screen name="login" options={{title:'Sign in',headerShown:false}}/>
    <Stack.Screen name="(tabs)" options={{headerShown:false}}/>
    <Stack.Screen name="search/index" options={{title:'Available buses'}}/>
    <Stack.Screen name="trip/[id]" options={{title:'Select seats'}}/>
    <Stack.Screen name="booking/checkout" options={{title:'Review booking'}}/>
    <Stack.Screen name="booking/manage" options={{title:'Manage booking'}}/>
    <Stack.Screen name="booking/reschedule" options={{title:'Reschedule'}}/>
    <Stack.Screen name="booking/review" options={{title:'Rate journey'}}/>
    <Stack.Screen name="support" options={{title:'Help & support'}}/>
    <Stack.Screen name="ticket/[id]" options={{title:'Your ticket'}}/>
    <Stack.Screen name="tracking/[id]" options={{title:'Live tracking'}}/>
  </Stack></AuthProvider></SafeAreaProvider>
}
