import { PropsWithChildren } from 'react';
import { ScrollView, ScrollViewProps, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';

export function Screen({ children, contentContainerStyle, ...props }: PropsWithChildren<ScrollViewProps>) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const horizontal = width >= 768 ? 28 : width <= 360 ? 14 : 18;
  return (
    <SafeAreaView style={styles.safe} edges={['top','left','right']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        {...props}
      >
        <View style={[styles.content,{paddingHorizontal:horizontal,paddingBottom:Math.max(32,insets.bottom+22)},contentContainerStyle]}>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.background},
  content:{width:'100%',maxWidth:760,alignSelf:'center',paddingTop:14,gap:16},
});
