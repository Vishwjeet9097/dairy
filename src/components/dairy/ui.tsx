import { Link, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  FileText,
  Home,
  MoreHorizontal,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export function PhoneShell({
  children,
  withNav = true,
}: {
  children: ReactNode;
  withNav?: boolean;
}) {
  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-surface shadow-[0_0_40px_rgba(0,0,0,0.05)] relative">
        <div className={cn("flex-1", withNav && "pb-32")}>{children}</div>
        {withNav ? <BottomNav /> : null}
      </div>
    </div>
  );
}

export function TopBar({
  title,
  back = true,
  right,
  variant = "brand",
}: {
  title: string;
  back?: boolean;
  right?: ReactNode;
  variant?: "brand" | "card";
}) {
  const router = useRouter();
  return (
    <header
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4",
        variant === "brand" ? "bg-brand text-primary-foreground" : "bg-card text-foreground"
      )}
    >
      {back ? (
        <button
          aria-label="Go back"
          onClick={() => router.history.back()}
          className="shrink-0 rounded-full p-1 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      ) : (
        <span className="h-5 w-5" />
      )}
      <h1 className="truncate text-center text-base font-semibold">{title}</h1>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center">{right}</div>
    </header>
  );
}

const navItems: { to: string; icon: LucideIcon; key: "home" | "delivery" | "customers" | "billing" | "more" }[] = [
  { to: "/", icon: Home, key: "home" },
  { to: "/delivery", icon: Truck, key: "delivery" },
  { to: "/customers", icon: Users, key: "customers" },
  { to: "/billing", icon: FileText, key: "billing" },
  { to: "/more", icon: MoreHorizontal, key: "more" },
];

export function BottomNav() {
  const { t } = useT();
  return (
    <div className="fixed bottom-6 left-1/2 z-40 w-full max-w-md -translate-x-1/2 px-6">
      <nav className="flex items-center justify-between rounded-[32px] bg-card px-2 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
        {navItems.map(({ to, icon: Icon, key }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="group relative flex flex-col items-center justify-center flex-1"
          >
            {({ isActive }) => (
              <div
                className={cn(
                  "flex flex-col items-center justify-center rounded-[20px] px-3 py-2 transition-all duration-300 min-w-[64px]",
                  isActive ? "bg-brand text-white shadow-[0_4px_12px_rgba(76,175,80,0.2)]" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className={cn("mt-1 text-[10px] font-semibold", isActive ? "text-white" : "")}>
                  {t(key)}
                </span>
              </div>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand-dark"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  );
}

export function StatusChip({ status }: { status: "delivered" | "pending" | "not_delivered" }) {
  const { t } = useT();
  const map = {
    delivered: { label: t("delivered"), cls: "bg-brand-soft text-brand border border-brand/30" },
    pending: { label: t("pending"), cls: "bg-warning-soft text-warning border border-warning/30" },
    not_delivered: { label: t("notDelivered"), cls: "bg-danger-soft text-danger border border-danger/30" },
  } as const;
  const s = map[status];
  return (
    <span className={cn("rounded-full px-3 py-1 text-[10px] uppercase tracking-wide font-semibold", s.cls)}>{s.label}</span>
  );
}

export function SectionCard({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl bg-card p-4 shadow-sm", className)}>
      {title || action ? (
        <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function StatTile({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: LucideIcon;
  tone: "brand" | "info" | "warning" | "danger";
  label: string;
  value: string;
}) {
  const tones = {
    brand: "bg-brand-soft text-brand",
    info: "bg-info-soft text-info",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
  } as const;
  return (
    <div className="rounded-2xl bg-card p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]", tones[tone])}>
            <Icon className="h-4 w-4" />
          </span>
          <p className="min-w-0 text-[11px] font-medium leading-tight text-muted-foreground">{label}</p>
        </div>
        <p className="text-xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function Sparkline({ points, color }: { points: number[]; color: string }) {
  const w = 140;
  const h = 46;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = max - min || 1;
  const coords = points.map((p, i) => {
    const x = (i / Math.max(points.length - 1, 1)) * w;
    const y = h - ((p - min) / span) * (h - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = `M ${coords.join(" L ")}`;
  const area = `${line} L ${w},${h} L 0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-12 w-full" preserveAspectRatio="none">
      <path d={area} fill={color} opacity="0.12" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function ActionRow({
  icon: Icon,
  tone,
  label,
  to,
  params,
  onClick,
  trailing,
}: {
  icon: LucideIcon;
  tone: "brand" | "info" | "warning" | "danger";
  label: string;
  to?: string;
  params?: Record<string, string> | undefined;
  onClick?: () => void;
  trailing?: ReactNode;
}) {
  const tones = {
    brand: "text-brand",
    info: "text-info",
    warning: "text-warning",
    danger: "text-danger",
  } as const;
  const inner = (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-4">
      <span className={cn("flex items-center justify-center", tones[tone])}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="truncate text-sm font-medium text-foreground">{label}</span>
      <span className="text-xs font-medium text-muted-foreground">{trailing}</span>
    </div>
  );
  if (to) {
    const AnyLink = Link as unknown as React.ComponentType<Record<string, unknown>>;
    return (
      <AnyLink to={to} params={params} className="block border-b border-border last:border-0">
        {inner}
      </AnyLink>
    );
  }
  return (
    <button onClick={onClick} className="block w-full border-b border-border text-left last:border-0">
      {inner}
    </button>
  );
}

export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

export function ClientOnly({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  if (!hydrated) return <div className="min-h-screen bg-surface" />;
  return <>{children}</>;
}
