import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Droplet,
  FileText,
  IndianRupee,
  Milk,
  ShoppingBag,
  Truck,
  UserPlus,
  Users,
  Wallet,
  XCircle,
  Search,
  SlidersHorizontal,
  ArrowRight
} from "lucide-react";
import {
  collectionOn,
  milkOn,
  money0,
  statusFor,
  todayISO,
  totalOutstanding,
  useDairy,
  useDairyActions,
} from "@/lib/dairy-store";
import { useT } from "@/lib/i18n";
import { Avatar, ClientOnly, PhoneShell, SectionCard, StatTile } from "@/components/dairy/ui";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Vishal Dairy Milk Delivery App" },
      { name: "description", content: "Daily milk delivery summary: customers, deliveries, collection and pending payments." },
      { property: "og:title", content: "Dashboard — Vishal Dairy Milk Delivery App" },
      { property: "og:description", content: "Daily milk delivery summary: customers, deliveries, collection and pending payments." },
    ],
  }),
  component: HomeRoute,
});

function HomeRoute() {
  return (
    <ClientOnly>
      <HomePage />
    </ClientOnly>
  );
}

function LanguageGate() {
  const { setLang } = useDairyActions();
  return (
    <div className="flex min-h-screen flex-col justify-center bg-card px-6">
      <h1 className="text-3xl font-bold leading-tight text-brand-dark">
        Milk Delivery
        <br />
        Management App
      </h1>
      <div className="mt-3 h-1 w-14 rounded-full bg-brand" />
      <p className="mt-5 text-sm text-muted-foreground">
        Clean, Modern &amp; Easy to Use for Daily Delivery &amp; Business Management.
      </p>
      <div className="mt-10 space-y-4">
        <button
          onClick={() => setLang("en")}
          className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-brand px-5 py-4 text-primary-foreground"
        >
          <span className="text-base font-semibold">English</span>
          <span className="rounded-md bg-white/20 px-2 py-1 text-xs font-semibold">EN</span>
        </button>
        <button
          onClick={() => setLang("hi")}
          className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border-2 border-brand bg-card px-5 py-4 text-brand-dark"
        >
          <span className="text-base font-semibold">हिंदी</span>
          <span className="rounded-md bg-brand-soft px-2 py-1 text-xs font-semibold text-brand-dark">HI</span>
        </button>
      </div>
    </div>
  );
}

function SummaryItem({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5 text-primary-foreground/90">
        <Icon className="h-4 w-4" strokeWidth={2.5} />
        <span className="text-sm font-semibold">+</span>
      </div>
      <p className="mt-1.5 text-[10px] leading-tight text-primary-foreground/90">{label}</p>
      <p className="mt-0.5 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  to,
  tone,
}: {
  icon: typeof Users;
  label: string;
  to: string;
  tone: string;
}) {
  return (
    <Link to={to} className="flex flex-col items-center gap-2 text-center">
      <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-[11px] leading-tight text-muted-foreground">{label}</span>
    </Link>
  );
}

function HomePage() {
  const { data } = useDairy();
  const { t } = useT();
  const navigate = useNavigate();
  const today = todayISO();

  if (data.lang === null) {
    return <LanguageGate />;
  }

  const active = data.customers.filter((c) => !c.paused);
  const morningDone = active.filter((c) => c.morningQty && statusFor(data, c.id, today, "morning") === "delivered").length;
  const eveningDone = active.filter((c) => c.eveningQty && statusFor(data, c.id, today, "evening") === "delivered").length;
  const pendingCount = active.reduce((n, c) => {
    let k = 0;
    if (c.morningQty && statusFor(data, c.id, today, "morning") === "pending") k++;
    if (c.eveningQty && statusFor(data, c.id, today, "evening") === "pending") k++;
    return n + k;
  }, 0);

  return (
    <PhoneShell>
      <div className="bg-surface px-6 pb-2 pt-6">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <Avatar name={data.settings.ownerName || "V D"} size={48} />
          <div className="min-w-0">
            <p className="text-[13px] text-muted-foreground flex items-center gap-1 font-medium">{t("hello")} <span>👋</span></p>
            <p className="truncate text-lg font-bold text-foreground">{data.settings.dairyName}</p>
          </div>
          <button
            aria-label="Notifications"
            onClick={() => navigate({ to: "/delivery" })}
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-white text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
          >
            <Bell className="h-5 w-5" />
            {pendingCount > 0 ? (
              <span className="absolute right-[11px] top-[11px] h-2 w-2 rounded-full bg-danger border-[1.5px] border-white"></span>
            ) : null}
          </button>
        </div>
      </div>

      <div className="space-y-6 px-6 py-4">
        <div className="relative flex items-center w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            type="text"
            className="block w-full rounded-full border-0 bg-white py-4 pl-11 pr-16 text-sm text-foreground shadow-[0_2px_12px_rgba(0,0,0,0.04)] ring-1 ring-inset ring-border/50 placeholder:text-muted-foreground focus:ring-2 focus:ring-inset focus:ring-brand outline-none"
            placeholder="Search customers..."
          />
          <button className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white shadow-sm hover:bg-brand-dark transition-colors">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#4CAF50] to-[#2E7D32] p-6 shadow-md">
          <div className="relative z-10 w-[70%]">
            <h2 className="text-xl font-bold leading-tight text-white mb-2">
              Deliveries for<br />Today: {pendingCount} Pending
            </h2>
            <button 
              onClick={() => navigate({ to: "/delivery" })}
              className="mt-4 rounded-full bg-white px-5 py-2.5 text-[13px] font-bold text-brand shadow-sm transition-transform active:scale-95"
            >
              Start Delivery
            </button>
          </div>
          <div className="absolute -right-4 -bottom-6 opacity-20 transform -rotate-12">
             <Milk className="h-48 w-48 text-white" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-foreground">Categories</h3>
            <span className="text-xs font-semibold text-muted-foreground cursor-pointer">See All</span>
          </div>
          
          <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide -mx-6 px-6">
            <Link to="/delivery" className="flex flex-col items-center gap-2 min-w-[72px]">
              <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full border-[2.5px] border-brand bg-[#F1F8E9] text-brand shadow-sm">
                <Truck className="h-7 w-7" />
              </div>
              <span className="text-[11px] font-semibold text-foreground text-center">Delivery</span>
            </Link>
            
            <Link to="/customers/new" className="flex flex-col items-center gap-2 min-w-[72px]">
              <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full border border-border bg-white text-muted-foreground shadow-sm">
                <UserPlus className="h-7 w-7" />
              </div>
              <span className="text-[11px] font-semibold text-foreground text-center">Customer</span>
            </Link>
            
            <Link to="/billing" className="flex flex-col items-center gap-2 min-w-[72px]">
              <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full border border-border bg-white text-muted-foreground shadow-sm">
                <Wallet className="h-7 w-7" />
              </div>
              <span className="text-[11px] font-semibold text-foreground text-center">Payment</span>
            </Link>
            
            <Link to="/reports" className="flex flex-col items-center gap-2 min-w-[72px]">
              <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full border border-border bg-white text-muted-foreground shadow-sm">
                <FileText className="h-7 w-7" />
              </div>
              <span className="text-[11px] font-semibold text-foreground text-center">Reports</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pb-8">
          <div className="flex flex-col rounded-[24px] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] relative overflow-hidden">
             <div className="flex-1 flex justify-center items-center py-4">
                <Milk className="h-[72px] w-[72px] text-[#4CAF50] opacity-90" strokeWidth={1} />
             </div>
             <p className="text-[11px] font-bold text-muted-foreground mt-2">Total Milk Delivered</p>
             <div className="flex items-end justify-between mt-1">
               <p className="text-[22px] font-bold text-foreground">{milkOn(data, today).toFixed(1)} L</p>
               <button 
                 onClick={() => navigate({ to: "/reports" })}
                 className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white shadow-md hover:bg-brand-dark transition-colors"
               >
                 <ArrowRight className="h-5 w-5" />
               </button>
             </div>
          </div>
          
          <div className="flex flex-col rounded-[24px] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] relative overflow-hidden">
             <div className="flex-1 flex justify-center items-center py-4">
                <IndianRupee className="h-[72px] w-[72px] text-[#4CAF50] opacity-90" strokeWidth={1} />
             </div>
             <p className="text-[11px] font-bold text-muted-foreground mt-2">Total Collection</p>
             <div className="flex items-end justify-between mt-1">
               <p className="text-[22px] font-bold text-foreground">{money0(collectionOn(data, today))}</p>
               <button 
                 onClick={() => navigate({ to: "/reports" })}
                 className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white shadow-md hover:bg-brand-dark transition-colors"
               >
                 <ArrowRight className="h-5 w-5" />
               </button>
             </div>
          </div>
        </div>

      </div>
    </PhoneShell>
  );
}
