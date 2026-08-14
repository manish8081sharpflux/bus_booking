import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card, Field, Muted, PrimaryButton, Title } from '@/components/UI';
import { colors } from '@/theme/colors';

const tomorrow=()=>new Date(Date.now()+86400000).toISOString().slice(0,10);

export default function Home(){
  const {width}=useWindowDimensions();
  const[from,setFrom]=useState('Pune'); const[to,setTo]=useState('Mumbai'); const[date,setDate]=useState(tomorrow());
  const search=()=>{if(!from.trim()||!to.trim()||!date)return Alert.alert('Complete your search','Enter source, destination and travel date.');if(from.trim().toLowerCase()===to.trim().toLowerCase())return Alert.alert('Choose a different destination');router.push({pathname:'/search',params:{from:from.trim(),to:to.trim(),date}})};
  const swap=()=>{const current=from;setFrom(to);setTo(current)};
  return <Screen>
    <View style={s.hero}><View style={s.brand}><View style={s.logo}><Ionicons name="bus" size={20} color="#fff"/></View><Text style={s.brandText}>BusGo</Text></View><Text style={s.eyebrow}>BOOK SMART. TRAVEL EASY.</Text><Title>Where do you want to go?</Title><Muted>Compare verified operators, live fares, boarding points and available seats.</Muted></View>
    <Card style={s.searchCard}>
      <View style={s.label}><Ionicons name="radio-button-on" size={16} color={colors.primary}/><Text style={s.labelText}>From</Text></View><Field value={from} onChangeText={setFrom} placeholder="Leaving from" returnKeyType="next"/>
      <Pressable accessibilityRole="button" accessibilityLabel="Swap source and destination" style={s.swap} onPress={swap}><Ionicons name="swap-vertical" size={20} color={colors.primary}/></Pressable>
      <View style={s.label}><Ionicons name="location" size={17} color={colors.primary}/><Text style={s.labelText}>To</Text></View><Field value={to} onChangeText={setTo} placeholder="Going to" returnKeyType="next"/>
      <View style={s.label}><Ionicons name="calendar-outline" size={17} color={colors.primary}/><Text style={s.labelText}>Travel date</Text></View><Field value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation"/>
      <View style={s.quickDates}><Pressable onPress={()=>setDate(tomorrow())} style={s.quick}><Text style={s.quickText}>Tomorrow</Text></Pressable><Pressable onPress={()=>setDate(new Date(Date.now()+2*86400000).toISOString().slice(0,10))} style={s.quick}><Text style={s.quickText}>Day after</Text></Pressable></View>
      <PrimaryButton title="Search buses" onPress={search}/>
    </Card>
    <View style={[s.features,width<520&&s.featuresStack]}>
      <Card style={s.feature}><View style={[s.featureIcon,{backgroundColor:colors.successSoft}]}><Ionicons name="shield-checkmark-outline" size={22} color={colors.success}/></View><Text style={s.featureTitle}>Secure booking</Text><Muted>Locked seats and server-verified fares.</Muted></Card>
      <Card style={s.feature}><View style={[s.featureIcon,{backgroundColor:'#E9FBEF'}]}><Ionicons name="logo-whatsapp" size={22} color="#128C7E"/></View><Text style={s.featureTitle}>WhatsApp updates</Text><Muted>Ticket and journey updates in one place.</Muted></Card>
    </View>
  </Screen>
}
const s=StyleSheet.create({hero:{paddingTop:4,gap:8},brand:{flexDirection:'row',alignItems:'center',gap:9},logo:{width:36,height:36,borderRadius:11,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},brandText:{fontSize:20,fontWeight:'900',color:colors.text},eyebrow:{fontSize:11,fontWeight:'900',letterSpacing:1.5,color:colors.primary,marginTop:4},searchCard:{position:'relative'},label:{flexDirection:'row',alignItems:'center',gap:7},labelText:{fontSize:13,fontWeight:'800',color:colors.textSecondary},swap:{position:'absolute',right:26,top:102,zIndex:3,width:42,height:42,borderRadius:21,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center',shadowColor:'#101828',shadowOpacity:.08,shadowRadius:6,elevation:3},quickDates:{flexDirection:'row',gap:8},quick:{paddingHorizontal:11,paddingVertical:7,borderRadius:999,backgroundColor:colors.primarySoft},quickText:{color:colors.primary,fontWeight:'800',fontSize:12},features:{flexDirection:'row',gap:12},featuresStack:{flexDirection:'column'},feature:{flex:1,minWidth:0},featureIcon:{width:42,height:42,borderRadius:13,alignItems:'center',justifyContent:'center'},featureTitle:{fontWeight:'900',fontSize:15,color:colors.text}})
