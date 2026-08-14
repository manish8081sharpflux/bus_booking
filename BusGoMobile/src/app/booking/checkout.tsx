import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card, Field, Muted, PrimaryButton, Title } from '@/components/UI';
import { bookingApi } from '@/lib/api';
import { Stop } from '@/types/api';
import { colors } from '@/theme/colors';

type PassengerDraft = { name: string; age: string; gender: string };
const emptyPassenger = (): PassengerDraft => ({ name: '', age: '', gender: '' });

export default function Checkout() {
  const { width } = useWindowDimensions();
  const p = useLocalSearchParams<{
    tripId: string;
    seatIds: string;
    seatNumbers?: string;
    boarding: string;
    dropping: string;
  }>();
  const seats = (p.seatIds || '').split(',').filter(Boolean);
  const seatNumbers = (p.seatNumbers || '').split(',').filter(Boolean);
  const boarding = useMemo(() => {
    try {
      return JSON.parse(p.boarding || '[]') as Stop[];
    } catch {
      return [];
    }
  }, [p.boarding]);
  const dropping = useMemo(() => {
    try {
      return JSON.parse(p.dropping || '[]') as Stop[];
    } catch {
      return [];
    }
  }, [p.dropping]);
  const [passengers, setPassengers] = useState<PassengerDraft[]>(() => seats.map(emptyPassenger));
  const [mobile, setMobile] = useState('');
  const [coupon, setCoupon] = useState('');
  const [boardId, setBoardId] = useState(boarding[0]?.id || '');
  const [dropId, setDropId] = useState(dropping[dropping.length - 1]?.id || '');
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const update = (i: number, key: keyof PassengerDraft, value: string) =>
    setPassengers((v) => v.map((x, n) => (n === i ? { ...x, [key]: value } : x)));
  const valid = () => {
    if (!boardId || !dropId) return 'Choose boarding and dropping points.';
    const boardStop = boarding.find((x) => x.id === boardId);
    const dropStop = dropping.find((x) => x.id === dropId);
    if (
      boardId === dropId ||
      (boardStop &&
        dropStop &&
        boardStop.stop_order !== undefined &&
        dropStop.stop_order !== undefined &&
        boardStop.stop_order >= dropStop.stop_order)
    ) {
      return 'Choose valid boarding and dropping points.';
    }
    if (!/^\d{10,15}$/.test(mobile.replace(/\D/g, ''))) return 'Enter a valid mobile number.';
    for (let i = 0; i < passengers.length; i++) {
      const x = passengers[i];
      if (x.name.trim().length < 2) return `Enter passenger ${i + 1} name.`;
      const a = Number(x.age);
      if (!Number.isInteger(a) || a < 1 || a > 120)
        return `Enter a valid age for passenger ${i + 1}.`;
      if (!['MALE', 'FEMALE', 'OTHER'].includes(x.gender.trim().toUpperCase()))
        return `Gender for passenger ${i + 1} must be Male, Female or Other.`;
    }
    return '';
  };
  const makeQuote = async () => {
    const err = valid();
    if (err) return Alert.alert('Check details', err);
    try {
      setBusy(true);
      const d = await bookingApi.quote({
        tripId: p.tripId,
        seatIds: seats,
        originStopId: boardId,
        destinationStopId: dropId,
        couponCode: coupon.trim() || undefined,
      });
      setQuote(d);
    } catch (e: any) {
      Alert.alert('Unable to lock fare', e.message);
    } finally {
      setBusy(false);
    }
  };
  const book = async () => {
    const err = valid();
    if (err) return Alert.alert('Check details', err);
    if (!quote) return;
    try {
      setBusy(true);
      const d = await bookingApi.create({
        quoteId: quote.id || quote.quoteId,
        tripId: p.tripId,
        seatIds: seats,
        originStopId: boardId,
        destinationStopId: dropId,
        contactMobile: mobile.replace(/\D/g, ''),
        passengers: passengers.map((x) => ({
          name: x.name.trim(),
          age: Number(x.age),
          gender: x.gender.trim().toUpperCase(),
        })),
      });
      const id = d.booking?.id || d.id;
      if (!id) throw new Error('Booking ID missing');
      await bookingApi.demoComplete(id);
      router.replace({ pathname: '/ticket/[id]', params: { id } });
    } catch (e: any) {
      Alert.alert(
        'Payment/booking failed',
        e.message || 'Please retry. Your booking has not been shown as confirmed.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Title>Passenger & journey</Title>
      <Muted>Enter one passenger for every selected seat.</Muted>
      {passengers.map((x, i) => (
        <Card key={seats[i]}>
          <Text style={s.passengerTitle}>
            Passenger {i + 1} · Seat {seatNumbers[i] || i + 1}
          </Text>
          <Field
            placeholder="Full name"
            value={x.name}
            onChangeText={(v) => update(i, 'name', v)}
          />
          <View style={[s.row, width < 430 && s.rowStack]}>
            <Field
              style={{ flex: 1 }}
              placeholder="Age"
              keyboardType="number-pad"
              value={x.age}
              onChangeText={(v) => update(i, 'age', v)}
            />
            <Field
              style={{ flex: 1 }}
              placeholder="Male / Female / Other"
              value={x.gender}
              onChangeText={(v) => update(i, 'gender', v)}
            />
          </View>
        </Card>
      ))}
      <Card>
        <Field
          placeholder="Contact mobile"
          keyboardType="phone-pad"
          value={mobile}
          onChangeText={setMobile}
        />
        <Field
          placeholder="Coupon code (optional)"
          autoCapitalize="characters"
          value={coupon}
          onChangeText={setCoupon}
        />
      </Card>
      <Card>
        <Text style={s.label}>Boarding point</Text>
        {boarding.map((x) => (
          <Text
            key={x.id}
            onPress={() => {
              setBoardId(x.id);
              setQuote(null);
            }}
            style={[s.stop, boardId === x.id && s.stopActive]}
          >
            ● {x.location_name}
            {x.landmark ? ` · ${x.landmark}` : ''}
          </Text>
        ))}
        <Text style={s.label}>Dropping point</Text>
        {dropping.map((x) => (
          <Text
            key={x.id}
            onPress={() => {
              setDropId(x.id);
              setQuote(null);
            }}
            style={[s.stop, dropId === x.id && s.stopActive]}
          >
            ● {x.location_name}
          </Text>
        ))}
      </Card>
      {quote ? (
        <Card>
          <Text style={s.quoteTitle}>Fare locked</Text>
          <Muted>Your checkout price is locked until the quote expires.</Muted>
          <View style={s.amountRow}>
            <Text>Total payable</Text>
            <Text style={s.amount}>
              ₹
              {Number(quote.totalAmount ?? quote.finalAmount ?? quote.total ?? 0).toLocaleString(
                'en-IN',
              )}
            </Text>
          </View>
          <PrimaryButton title="Confirm booking" loading={busy} onPress={book} />
        </Card>
      ) : (
        <PrimaryButton title="Lock fare & review" loading={busy} onPress={makeQuote} />
      )}
    </Screen>
  );
}
const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  rowStack: { flexDirection: 'column' },
  passengerTitle: { fontWeight: '900', fontSize: 16, color: colors.text },
  label: { fontWeight: '900', color: colors.text, marginTop: 4 },
  stop: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    color: colors.text,
  },
  stopActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFF1F3',
    color: colors.primary,
    fontWeight: '800',
  },
  quoteTitle: { fontWeight: '900', fontSize: 18, color: colors.text },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontWeight: '900', fontSize: 24, color: colors.primary },
});
