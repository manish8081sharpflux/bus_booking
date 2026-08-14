import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card, Muted, PrimaryButton, Title } from '@/components/UI';
import { bookingApi } from '@/lib/api';
import { colors } from '@/theme/colors';
export default function Reschedule() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [seatData, setSeatData] = useState<any>(null);
  const [seatIds, setSeatIds] = useState<string[]>([]);
  const [board, setBoard] = useState('');
  const [drop, setDrop] = useState('');
  const [quote, setQuote] = useState<any>(null);
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    bookingApi
      .rescheduleOptions(id)
      .then(setData)
      .catch((e: any) => Alert.alert('Reschedule unavailable', e.message))
      .finally(() => setBusy(false));
  }, [id]);
  const choose = async (o: any) => {
    try {
      setBusy(true);
      setSelected(o);
      setQuote(null);
      const d = await bookingApi.seats(o.id);
      setSeatData(d);
      setSeatIds([]);
      setBoard(d.boardingPoints?.[0]?.id || '');
      setDrop(d.droppingPoints?.[d.droppingPoints.length - 1]?.id || '');
    } catch (e: any) {
      Alert.alert('Unable to load replacement trip', e.message);
    } finally {
      setBusy(false);
    }
  };
  const count = Number(data?.passengerCount || 1);
  const toggle = (x: any) => {
    if (x.status !== 'AVAILABLE') return;
    setQuote(null);
    setSeatIds((v) =>
      v.includes(x.id) ? v.filter((i) => i !== x.id) : v.length >= count ? v : [...v, x.id],
    );
  };
  const payload = () => ({
    newTripId: selected.id,
    newOriginStopId: board,
    newDestinationStopId: drop,
    newSeatIds: seatIds,
  });
  const makeQuote = async () => {
    if (!board || !drop)
      return Alert.alert('Choose points', 'Choose boarding and dropping points.');
    const boardStop = seatData?.boardingPoints?.find((x: any) => x.id === board);
    const dropStop = seatData?.droppingPoints?.find((x: any) => x.id === drop);
    if (
      board === drop ||
      (boardStop &&
        dropStop &&
        boardStop.stop_order !== undefined &&
        dropStop.stop_order !== undefined &&
        boardStop.stop_order >= dropStop.stop_order)
    )
      return Alert.alert('Choose points', 'Choose valid boarding and dropping points.');
    if (seatIds.length !== count)
      return Alert.alert(
        'Choose seats',
        `Choose exactly ${count} replacement seat${count > 1 ? 's' : ''}.`,
      );
    try {
      setBusy(true);
      setQuote(await bookingApi.rescheduleQuote(id, payload()));
    } catch (e: any) {
      Alert.alert('Unable to quote reschedule', e.message);
    } finally {
      setBusy(false);
    }
  };
  const confirm = async () => {
    if (!board || !drop)
      return Alert.alert('Choose points', 'Choose boarding and dropping points.');
    const boardStop = seatData?.boardingPoints?.find((x: any) => x.id === board);
    const dropStop = seatData?.droppingPoints?.find((x: any) => x.id === drop);
    if (
      board === drop ||
      (boardStop &&
        dropStop &&
        boardStop.stop_order !== undefined &&
        dropStop.stop_order !== undefined &&
        boardStop.stop_order >= dropStop.stop_order)
    )
      return Alert.alert('Choose points', 'Choose valid boarding and dropping points.');
    try {
      setBusy(true);
      await bookingApi.confirmReschedule(id, payload());
      Alert.alert('Journey rescheduled', 'Your booking has been updated.');
      router.replace({ pathname: '/ticket/[id]', params: { id } });
    } catch (e: any) {
      Alert.alert('Reschedule failed', e.message);
    } finally {
      setBusy(false);
    }
  };
  if (busy && !data)
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  return (
    <Screen>
      <Title>Reschedule journey</Title>
      <Muted>Choose another trip from the same operator and route.</Muted>
      {!selected ? (
        (data?.options || []).map((o: any) => (
          <Pressable key={o.id} onPress={() => choose(o)}>
            <Card>
              <Text style={s.route}>{new Date(o.departure_at).toLocaleString('en-IN')}</Text>
              <Muted>
                {o.operator} · {o.bus}
              </Muted>
              <View style={s.line}>
                <Text>{o.available_seats} seats</Text>
                <Text style={s.money}>
                  from ₹{Number(o.starting_fare || 0).toLocaleString('en-IN')}
                </Text>
              </View>
            </Card>
          </Pressable>
        ))
      ) : (
        <>
          <Card>
            <Text style={s.route}>{new Date(selected.departure_at).toLocaleString('en-IN')}</Text>
            <Muted>
              Select exactly {count} seat{count > 1 ? 's' : ''}.
            </Muted>
            <View style={s.grid}>
              {(seatData?.seats || []).map((x: any) => (
                <Pressable
                  key={x.id}
                  disabled={x.status !== 'AVAILABLE'}
                  onPress={() => toggle(x)}
                  style={[
                    s.seat,
                    x.status !== 'AVAILABLE' && s.off,
                    seatIds.includes(x.id) && s.on,
                  ]}
                >
                  <Text style={seatIds.includes(x.id) && s.white}>{x.seat_number}</Text>
                </Pressable>
              ))}
            </View>
          </Card>
          <Card>
            <Text style={s.h}>Boarding</Text>
            {(seatData?.boardingPoints || []).map((x: any) => (
              <Text
                key={x.id}
                onPress={() => {
                  setBoard(x.id);
                  setQuote(null);
                }}
                style={[s.stop, board === x.id && s.stopOn]}
              >
                {x.location_name}
              </Text>
            ))}
            <Text style={s.h}>Dropping</Text>
            {(seatData?.droppingPoints || []).map((x: any) => (
              <Text
                key={x.id}
                onPress={() => {
                  setDrop(x.id);
                  setQuote(null);
                }}
                style={[s.stop, drop === x.id && s.stopOn]}
              >
                {x.location_name}
              </Text>
            ))}
          </Card>
          {quote ? (
            <Card>
              <Text style={s.h}>Reschedule summary</Text>
              <Text>New total: ₹{Number(quote.newTotal || 0).toLocaleString('en-IN')}</Text>
              <Text>
                Fare difference: ₹{Number(quote.fareDifference || 0).toLocaleString('en-IN')}
              </Text>
              <Text>Fee: ₹{Number(quote.rescheduleFee || 0).toLocaleString('en-IN')}</Text>
              <PrimaryButton title="Confirm reschedule" loading={busy} onPress={confirm} />
            </Card>
          ) : (
            <PrimaryButton title="Review fare difference" loading={busy} onPress={makeQuote} />
          )}
          <PrimaryButton
            title="Choose another trip"
            variant="secondary"
            onPress={() => {
              setSelected(null);
              setSeatData(null);
              setQuote(null);
            }}
          />
        </>
      )}
    </Screen>
  );
}
const s = StyleSheet.create({
  route: { fontWeight: '900', fontSize: 17, color: colors.text },
  line: { flexDirection: 'row', justifyContent: 'space-between' },
  money: { fontWeight: '900', color: colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seat: {
    width: 52,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  off: { opacity: 0.3 },
  on: { backgroundColor: colors.primary, borderColor: colors.primary },
  white: { color: '#fff', fontWeight: '900' },
  h: { fontWeight: '900', color: colors.text },
  stop: { padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10 },
  stopOn: {
    borderColor: colors.primary,
    backgroundColor: '#FFF1F3',
    color: colors.primary,
    fontWeight: '800',
  },
});
