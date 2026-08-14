import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { colors } from '@/theme/colors';

const icon = (name: keyof typeof Ionicons.glyphMap) => ({color,size}:{color:string;size:number}) => <Ionicons name={name} color={color} size={size}/>;

export default function TabsLayout(){
  return <Tabs screenOptions={{
    headerStyle:{backgroundColor:colors.surface},
    headerShadowVisible:false,
    headerTitleStyle:{fontWeight:'900',color:colors.text},
    tabBarActiveTintColor:colors.primary,
    tabBarInactiveTintColor:colors.muted,
    tabBarLabelStyle:{fontSize:11,fontWeight:'800',marginTop:2},
    tabBarStyle:{height:Platform.OS==='ios'?82:70,paddingBottom:Platform.OS==='ios'?20:9,paddingTop:7,borderTopColor:colors.border,backgroundColor:colors.surface},
    sceneStyle:{backgroundColor:colors.background},
  }}>
    <Tabs.Screen name="index" options={{title:'Home',headerShown:false,tabBarIcon:icon('home-outline')}}/>
    <Tabs.Screen name="bookings" options={{title:'Bookings',tabBarIcon:icon('ticket-outline')}}/>
    <Tabs.Screen name="offers" options={{title:'Offers',tabBarIcon:icon('pricetag-outline')}}/>
    <Tabs.Screen name="profile" options={{title:'Profile',tabBarIcon:icon('person-outline')}}/>
  </Tabs>
}
