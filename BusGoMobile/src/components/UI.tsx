import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';

export function Title({children}:{children:ReactNode}){return <Text accessibilityRole="header" style={s.title}>{children}</Text>}
export function Muted({children}:{children:ReactNode}){return <Text style={s.muted}>{children}</Text>}
export function Card({children,style}:{children:ReactNode;style?:StyleProp<ViewStyle>}){return <View style={[s.card,style]}>{children}</View>}
export function Field(props:TextInputProps){return <TextInput placeholderTextColor={colors.subtle} selectionColor={colors.primary} {...props} style={[s.input,props.multiline&&s.multiline,props.style]}/>}
export function PrimaryButton({title,onPress,disabled,loading,variant='primary'}:{title:string;onPress:()=>void;disabled?:boolean;loading?:boolean;variant?:'primary'|'secondary'|'danger'|'ghost'}){
 const textStyle=variant==='primary'?s.primaryText:variant==='danger'?s.dangerText:s.secondaryText;
 return <Pressable accessibilityRole="button" accessibilityState={{disabled:!!(disabled||loading),busy:!!loading}} disabled={disabled||loading} onPress={onPress} style={({pressed})=>[s.button,variant==='primary'&&s.primary,variant==='secondary'&&s.secondary,variant==='danger'&&s.danger,variant==='ghost'&&s.ghost,(disabled||loading)&&s.disabled,pressed&&s.pressed]}>{loading?<ActivityIndicator color={variant==='primary'?'#fff':colors.primary}/>:<Text style={textStyle}>{title}</Text>}</Pressable>
}
export function Pill({text,tone='default'}:{text:string;tone?:'default'|'success'|'danger'|'warning'|'info'}){return <View style={[s.pill,tone==='success'&&s.pillSuccess,tone==='danger'&&s.pillDanger,tone==='warning'&&s.pillWarning,tone==='info'&&s.pillInfo]}><Text style={[s.pillText,tone==='success'&&s.successText,tone==='danger'&&s.dangerPillText,tone==='warning'&&s.warningText,tone==='info'&&s.infoText]}>{text}</Text></View>}
export function SectionTitle({children}:{children:ReactNode}){return <Text style={s.section}>{children}</Text>}
export function Divider(){return <View style={s.divider}/>}

const s=StyleSheet.create({
 title:{fontSize:28,lineHeight:34,fontWeight:'900',color:colors.text,letterSpacing:-.65},
 muted:{fontSize:14,color:colors.muted,lineHeight:21},
 section:{fontSize:16,fontWeight:'900',color:colors.text,letterSpacing:-.15},
 card:{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:20,padding:16,gap:11,shadowColor:'#101828',shadowOpacity:.055,shadowRadius:14,shadowOffset:{width:0,height:6},elevation:2},
 input:{minHeight:52,borderWidth:1,borderColor:colors.borderStrong,borderRadius:14,paddingHorizontal:14,backgroundColor:colors.surface,color:colors.text,fontSize:15},
 multiline:{minHeight:116,paddingTop:13,textAlignVertical:'top'},
 button:{minHeight:52,borderRadius:14,alignItems:'center',justifyContent:'center',paddingHorizontal:18,borderWidth:1},
 primary:{backgroundColor:colors.primary,borderColor:colors.primary},
 secondary:{backgroundColor:colors.surface,borderColor:colors.borderStrong},
 danger:{backgroundColor:colors.dangerSoft,borderColor:'#FDA29B'},
 ghost:{backgroundColor:'transparent',borderColor:'transparent'},
 primaryText:{color:'#fff',fontSize:16,fontWeight:'900'},
 secondaryText:{color:colors.text,fontSize:15,fontWeight:'800'},
 dangerText:{color:colors.danger,fontSize:15,fontWeight:'900'},
 disabled:{opacity:.45},pressed:{transform:[{scale:.992}],opacity:.9},
 pill:{alignSelf:'flex-start',paddingHorizontal:10,paddingVertical:5,borderRadius:999,backgroundColor:'#F2F4F7'},
 pillText:{color:colors.muted,fontWeight:'800',fontSize:12},
 pillSuccess:{backgroundColor:colors.successSoft},pillDanger:{backgroundColor:colors.dangerSoft},pillWarning:{backgroundColor:colors.warningSoft},pillInfo:{backgroundColor:colors.infoSoft},
 successText:{color:colors.success},dangerPillText:{color:colors.danger},warningText:{color:colors.warning},infoText:{color:colors.info},
 divider:{height:1,backgroundColor:colors.border,marginVertical:2},
});
