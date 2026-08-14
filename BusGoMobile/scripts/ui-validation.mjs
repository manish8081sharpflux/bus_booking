import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const must=[
 ['src/components/Screen.tsx',['useWindowDimensions','maxWidth:760','useSafeAreaInsets']],
 ['src/components/UI.tsx',['minHeight:52','accessibilityRole="button"','variant=']],
 ['src/app/(tabs)/index.tsx',['featuresStack','accessibilityLabel="Swap source and destination"']],
 ['src/app/trip/[id].tsx',['accessibilityState','Maximum 6 seats','useWindowDimensions']],
 ['src/app/booking/checkout.tsx',['passengers.map','rowStack','Payment/booking failed']],
];
const failures=[];
for(const [file,tokens] of must){const text=fs.readFileSync(path.join(root,file),'utf8');for(const t of tokens)if(!text.includes(t))failures.push(`${file}: missing ${t}`)}
if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log('Native mobile responsive/UI validation passed.');
