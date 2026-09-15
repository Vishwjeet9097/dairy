import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  AlertCircle, Bell, ChevronRight,
  FileText, IndianRupee, Milk, Pencil,
  Search, Settings2,
  TrendingUp,
  Truck,
  UserPlus, Wallet,
} from 'lucide-react-native';
import {
  Image,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNav } from '../components/ui';
import { cardBorder, cardShadow, Colors, softShadow } from '../constants/theme';
import { useAppTheme } from '../context/theme-context';
import {
  collectionOn,
  customerBilled,
  customerPaid,
  milkOn,
  money0,
  outstanding,
  statusFor,
  todayISO,
  totalOutstanding,
  useDairyStore,
} from '../lib/dairy-store';

// ─── helpers ────────────────────────────────────────────────────────────────
function addDays(d: string, n: number) {
  const dt = new Date(d + 'T00:00:00');
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}

/**
 * Derive two gradient stops from a single hex color.
 * Returns [dark, mid, light] suitable for LinearGradient.
 */
function gradientFromAccent(hex: string, dark: string): [string, string, string] {
  return [dark, hex, hex + 'CC'];
}

/** Tiny sparkline — pure RN, no SVG dep */
function Sparkline({
  data,
  color,
  width = 100,
  height = 36,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - (v / max) * (height - 6) - 3,
  }));
  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      {pts.slice(0, -1).map((p, i) => {
        const next = pts[i + 1]!;
        const dx = next.x - p.x;
        const dy = next.y - p.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: p.x,
              top: p.y,
              width: len,
              height: 2,
              backgroundColor: color,
              opacity: 0.7,
              borderRadius: 1,
              transform: [{ rotate: `${angle}deg` }],
              transformOrigin: '0 50%',
            }}
          />
        );
      })}
    </View>
  );
}

// ─── component ───────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const { accent } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { customers, settings } = useDairyStore();
  const state = useDairyStore.getState();

  const today = todayISO();
  const active = customers.filter(c => !c.paused);

  // delivery counts
  let pendingCount = 0;
  let deliveredCount = 0;
  let notDeliveredCount = 0;
  for (const c of active) {
    for (const slot of ['morning', 'evening'] as const) {
      const qty = slot === 'morning' ? c.morningQty : c.eveningQty;
      if (!qty) continue;
      const s = statusFor(state, c.id, today, slot);
      if (s === 'pending') pendingCount++;
      else if (s === 'delivered') deliveredCount++;
      else notDeliveredCount++;
    }
  }
  const totalSlots = pendingCount + deliveredCount + notDeliveredCount;
  const progressPct = totalSlots > 0 ? deliveredCount / totalSlots : 0;

  // today stats
  const totalMilk = milkOn(state, today);
  const totalCollection = collectionOn(state, today);

  // month dues
  const monthStart = today.slice(0, 7) + '-01';
  let monthBilled = 0;
  let monthPaid = 0;
  for (const c of customers) {
    monthBilled += customerBilled(state, c.id, monthStart, today);
    monthPaid += customerPaid(state, c.id, monthStart, today);
  }
  const monthPending = Math.max(0, monthBilled - monthPaid);
  const totalOut = totalOutstanding(state);
  const highBalanceCount = customers.filter(c => outstanding(state, c.id) > 500).length;

  // sparkline data — last 7 days milk & collection
  const milkData: number[] = [];
  const collData: number[] = [];
  for (let i = 6; i >= 0; i--) {
    milkData.push(milkOn(state, addDays(today, -i)));
    collData.push(collectionOn(state, addDays(today, -i)));
  }

  // recent activity — last 5 delivery events today
  const recentDeliveries = state.deliveries
    .filter(d => d.date === today)
    .slice(-5)
    .reverse();

  const dateLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  // Hero gradient derived from accent so it responds to any theme
  const heroGradient = gradientFromAccent(accent.color, accent.dark);

  const categories = [
    { label: 'Delivery', icon: Truck, to: '/delivery', bg: accent.soft, iconColor: accent.color },
    { label: 'Customers', icon: UserPlus, to: '/customers', bg: Colors.infoSoft, iconColor: Colors.info },
    { label: 'Billing', icon: Wallet, to: '/billing', bg: '#EDE7F6', iconColor: '#6A1B9A' },
    { label: 'Reports', icon: FileText, to: '/reports', bg: '#FFF3E0', iconColor: '#E65100' },
  ];

  const topPad = insets.top > 0 ? insets.top : Platform.OS === 'android' ? 32 : 44;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Top bar ───────────────────────────────────── */}
        <View
          style={{
            paddingTop: topPad,
            paddingHorizontal: 20,
            paddingBottom: 12,
            backgroundColor: Colors.background,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Avatar + greeting */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: accent.color,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '800', color: 'white' }}>
                {settings.ownerName?.charAt(0) ?? 'V'}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 13, color: Colors.mutedForeground, fontWeight: '600' }}>
                Hello 👋
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: Colors.foreground, letterSpacing: -0.3 }}>
                  {settings.dairyName}
                </Text>
                {/* Pro badge */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 3,
                    backgroundColor: accent.soft,
                    borderRadius: 20,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderWidth: 1,
                    borderColor: `${accent.color}40`,
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: accent.color,
                    }}
                  />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: accent.color }}>
                    Pro
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Bell */}
          <TouchableOpacity
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: Colors.card,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(0, 0, 0, 0.04)',
              ...softShadow,
            }}
          >
            <Bell size={20} color={Colors.foreground} />
            {pendingCount > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: Colors.danger,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: Colors.card,
                }}
              >
                <Text style={{ fontSize: 8, fontWeight: '900', color: 'white' }}>
                  {pendingCount > 9 ? '9+' : pendingCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Search bar ───────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: Colors.card,
              borderRadius: 18,
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderWidth: 1,
              borderColor: 'rgba(0, 0, 0, 0.04)',
              ...softShadow,
            }}
          >
            <Search size={18} color={Colors.mutedForeground} style={{ marginRight: 10 }} />
            <TextInput
              placeholder="Search deliveries, customers..."
              placeholderTextColor={Colors.mutedForeground}
              style={{
                flex: 1,
                fontSize: 14,
                fontWeight: '500',
                color: Colors.foreground,
              }}
            />
            <Settings2 size={18} color={accent.color} />
          </View>
        </View>

        {/* ══════════════════════════════════════════════════
            HERO CARD — Clean Apple subtle elevation
        ══════════════════════════════════════════════════ */}
        <View style={{ paddingHorizontal: 20, marginBottom: 4 }}>
          <View
            style={{
              borderRadius: 24,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: 'rgba(0, 0, 0, 0.04)',
              ...cardShadow,
            }}
          >
            <LinearGradient
              colors={heroGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ minHeight: 200 }}
            >
              {/* decorative circles */}
              <View
                style={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  top: 30,
                  right: 10,
                  width: 70,
                  height: 70,
                  borderRadius: 35,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                }}
              />

              {/* Content row */}
              <View style={{ flexDirection: 'row', padding: 20 }}>
                {/* Left: text + progress + CTA */}
                <View style={{ flex: 1, paddingRight: 8 }}>
                  {/* Date chip */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      backgroundColor: 'rgba(255,255,255,0.18)',
                      alignSelf: 'flex-start',
                      borderRadius: 20,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      marginBottom: 14,
                    }}
                  >
                    <View
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        backgroundColor: 'rgba(255,255,255,0.5)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 8, fontWeight: '900', color: accent.dark }}>
                        {new Date().getDate()}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.95)' }}>
                      {dateLabel}
                    </Text>
                  </View>

                  {/* Label */}
                  <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                    Pending Deliveries
                  </Text>

                  {/* Big number */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 14 }}>
                    <Text style={{ fontSize: 50, fontWeight: '900', color: '#fff', letterSpacing: -3, lineHeight: 54 }}>
                      {pendingCount}
                    </Text>
                    <Text style={{ fontSize: 18, fontWeight: '600', color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>
                      /{totalSlots}
                    </Text>
                  </View>

                  {/* Progress bar */}
                  <View
                    style={{
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: 'rgba(255,255,255,0.25)',
                      marginBottom: 6,
                    }}
                  >
                    <View
                      style={{
                        height: 5,
                        borderRadius: 3,
                        backgroundColor: '#fff',
                        width: `${Math.round(progressPct * 100)}%`,
                      }}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 }}>
                    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>
                      {deliveredCount} delivered
                    </Text>
                    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>
                      {Math.round(progressPct * 100)}% done
                    </Text>
                  </View>

                  {/* CTA button */}
                  <TouchableOpacity
                    onPress={() => router.push('/delivery')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      alignSelf: 'flex-start',
                      borderRadius: 14,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.35)',
                    }}
                  >
                    <Truck size={16} color="white" />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: 'white' }}>
                      Start Delivery
                    </Text>
                    <ChevronRight size={14} color="rgba(255,255,255,0.8)" />
                  </TouchableOpacity>
                </View>

                {/* Right: milk bottle image */}
                <View
                  style={{
                    width: 145,
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                  }}
                >
                  <Image
                    source={require('../../assets/images/onboarding.png')}
                    style={{
                      width: 135,
                      height: 185,
                      resizeMode: 'contain',
                    }}
                  />
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* ── 3-stat strip ───────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20, marginTop: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: Colors.card,
              borderRadius: 20,
              ...cardBorder,
              ...cardShadow,
            }}
          >
            {[
              { label: "Today's Milk", value: `${totalMilk.toFixed(1)} L`, icon: Milk, bg: accent.soft, ic: accent.color },
              { label: 'Collected', value: money0(totalCollection), icon: IndianRupee, bg: Colors.infoSoft, ic: Colors.info },
              { label: 'Active Customers', value: `${active.length}`, icon: UserPlus, bg: '#FFF3E0', ic: '#E65100' },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <View
                  key={s.label}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 16,
                    borderRightWidth: i < 2 ? 1 : 0,
                    borderRightColor: Colors.border,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: s.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <Icon size={17} color={s.ic} />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.foreground }}>
                    {s.value}
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: Colors.mutedForeground, marginTop: 2, textAlign: 'center', paddingHorizontal: 4 }}>
                    {s.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Quick Access ───────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: Colors.foreground }}>
              Quick Access
            </Text>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: accent.color }}>Customize</Text>
              <Pencil size={12} color={accent.color} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {categories.map(cat => {
              const Icon = cat.icon;
              return (
                <TouchableOpacity
                  key={cat.label}
                  onPress={() => router.push(cat.to as any)}
                  style={{ alignItems: 'center', gap: 8 }}
                >
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 20,
                      backgroundColor: cat.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      ...cardBorder,
                      ...cardShadow,
                    }}
                  >
                    <Icon size={28} color={cat.iconColor} />
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.foreground }}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Today's Overview cards ─────────────────── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <TrendingUp size={17} color={accent.color} />
            <Text style={{ fontSize: 17, fontWeight: '800', color: Colors.foreground }}>
              Today's Overview
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            {/* Milk card */}
            <View
              style={{
                flex: 1,
                backgroundColor: Colors.card,
                borderRadius: 20,
                padding: 16,
                ...cardBorder,
                ...cardShadow,
                overflow: 'hidden',
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '800', color: accent.color, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>
                Today's Milk
              </Text>
              <Text style={{ fontSize: 24, fontWeight: '900', color: Colors.foreground, marginBottom: 12 }}>
                {totalMilk.toFixed(1)} L
              </Text>
              <Sparkline data={milkData} color={accent.color} width={120} height={40} />
              {/* decorative image */}
              <Image
                source={require('../../assets/images/onboarding.png')}
                style={{
                  position: 'absolute',
                  bottom: -4,
                  right: -8,
                  width: 60,
                  height: 60,
                  opacity: 0.1,
                  resizeMode: 'contain',
                }}
              />
            </View>

            {/* Collection card */}
            <View
              style={{
                flex: 1,
                backgroundColor: Colors.card,
                borderRadius: 20,
                padding: 16,
                ...cardBorder,
                ...cardShadow,
                overflow: 'hidden',
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '800', color: Colors.info, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>
                Today's Collection
              </Text>
              <Text style={{ fontSize: 24, fontWeight: '900', color: Colors.foreground, marginBottom: 12 }}>
                {money0(totalCollection)}
              </Text>
              <Sparkline data={collData} color={Colors.info} width={120} height={40} />
            </View>
          </View>
        </View>

        {/* ── Financial info strip ────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View
            style={{
              backgroundColor: Colors.card,
              borderRadius: 20,
              overflow: 'hidden',
              ...cardBorder,
              ...cardShadow,
            }}
          >
            {[
              {
                icon: IndianRupee,
                bg: Colors.infoSoft,
                ic: Colors.info,
                label: 'Est. dues this month',
                value: money0(monthPending),
                valueColor: monthPending > 0 ? Colors.danger : Colors.success,
              },
              {
                icon: Wallet,
                bg: totalOut > 0 ? Colors.dangerSoft : Colors.successSoft,
                ic: totalOut > 0 ? Colors.danger : Colors.success,
                label: 'Total outstanding',
                value: money0(totalOut),
                valueColor: totalOut > 0 ? Colors.danger : Colors.success,
              },
              ...(highBalanceCount > 0
                ? [{
                  icon: AlertCircle,
                  bg: Colors.warningSoft,
                  ic: Colors.warning,
                  label: 'Customers with due >₹500',
                  value: `${highBalanceCount}`,
                  valueColor: Colors.warning,
                }]
                : []),
            ].map((row, i, arr) => {
              const Icon = row.icon;
              return (
                <View
                  key={row.label}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 13,
                    borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                    borderBottomColor: Colors.border,
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: row.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    <Icon size={15} color={row.ic} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: Colors.mutedForeground }}>
                    {row.label}
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: row.valueColor }}>
                    {row.value}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Recent Activity ────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: Colors.foreground }}>
              Recent Activity
            </Text>
            <TouchableOpacity onPress={() => router.push('/delivery')}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: accent.color }}>
                View All
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ backgroundColor: Colors.card, borderRadius: 20, overflow: 'hidden', ...cardBorder, ...cardShadow }}>
            {recentDeliveries.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.mutedForeground }}>
                  No deliveries recorded today yet.
                </Text>
              </View>
            ) : (
              recentDeliveries.map((d, i) => {
                const cust = customers.find(c => c.id === d.customerId);
                const isDelivered = d.status === 'delivered';
                const isSkipped = d.status === 'not_delivered';
                return (
                  <View
                    key={d.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 13,
                      borderBottomWidth: i < recentDeliveries.length - 1 ? 1 : 0,
                      borderBottomColor: Colors.border,
                    }}
                  >
                    {/* icon */}
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: isDelivered ? accent.soft : isSkipped ? Colors.dangerSoft : Colors.warningSoft,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}
                    >
                      <Truck
                        size={18}
                        color={isDelivered ? accent.color : isSkipped ? Colors.danger : Colors.warning}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.foreground }} numberOfLines={1}>
                        {d.slot === 'morning' ? 'Morning' : 'Evening'} Delivery
                        {cust ? ` — ${cust.name}` : ''}
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: Colors.mutedForeground, marginTop: 1 }}>
                        {today} · {d.qty} L · ₹{d.qty * d.rate}
                      </Text>
                    </View>

                    {/* status pill */}
                    <View
                      style={{
                        backgroundColor: isDelivered ? accent.soft : isSkipped ? Colors.dangerSoft : Colors.warningSoft,
                        borderRadius: 20,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '800',
                          color: isDelivered ? accent.color : isSkipped ? Colors.danger : Colors.warning,
                        }}
                      >
                        {isDelivered ? 'Completed' : isSkipped ? 'Skipped' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

      </ScrollView>

      <BottomNav />
    </View>
  );
}
