"use client";

import { useState, type ReactNode } from "react";
import {
  Pulse,
  Airplane,
  Atom,
  Backpack,
  Barbell,
  Basketball,
  Bed,
  Bicycle,
  Book,
  BookOpen,
  Brain,
  Briefcase,
  Calendar,
  Camera,
  ChartBar,
  ChartLineUp,
  ChatCircle,
  CheckSquare,
  Clock,
  Cloud,
  Code,
  Coffee,
  Compass,
  CookingPot,
  CreditCard,
  Drop,
  Egg,
  Envelope,
  ForkKnife,
  Gauge,
  Heart,
  House,
  Lightbulb,
  ListChecks,
  MapPin,
  Medal,
  MoonStars,
  MusicNote,
  NotePencil,
  Notepad,
  Package,
  Pencil,
  PiggyBank,
  Pill,
  Plant,
  Smiley,
  SneakerMove,
  SoccerBall,
  Star,
  Sun,
  Target,
  TestTube,
  Timer,
  Trophy,
  User,
  UsersThree,
  Wallet,
  Wrench,
  type Icon,
} from "@phosphor-icons/react";

// Curated set — pick something that covers most module flavors without being
// 1,200+ options. Keyed by token used in `module.profile.icon` as "ph:<Name>".
export const MODULE_ICONS: { name: string; Icon: Icon; label: string }[] = [
  { name: "Pulse", Icon: Pulse, label: "Activity" },
  { name: "Airplane", Icon: Airplane, label: "Airplane" },
  { name: "Atom", Icon: Atom, label: "Atom" },
  { name: "Backpack", Icon: Backpack, label: "Backpack" },
  { name: "Barbell", Icon: Barbell, label: "Barbell" },
  { name: "Basketball", Icon: Basketball, label: "Basketball" },
  { name: "Bed", Icon: Bed, label: "Bed" },
  { name: "Bicycle", Icon: Bicycle, label: "Bicycle" },
  { name: "Book", Icon: Book, label: "Book" },
  { name: "BookOpen", Icon: BookOpen, label: "Reading" },
  { name: "Brain", Icon: Brain, label: "Brain" },
  { name: "Briefcase", Icon: Briefcase, label: "Work" },
  { name: "Calendar", Icon: Calendar, label: "Calendar" },
  { name: "Camera", Icon: Camera, label: "Camera" },
  { name: "ChartBar", Icon: ChartBar, label: "Bar chart" },
  { name: "ChartLineUp", Icon: ChartLineUp, label: "Trend" },
  { name: "ChatCircle", Icon: ChatCircle, label: "Chat" },
  { name: "CheckSquare", Icon: CheckSquare, label: "Tasks" },
  { name: "Clock", Icon: Clock, label: "Time" },
  { name: "Cloud", Icon: Cloud, label: "Cloud" },
  { name: "Code", Icon: Code, label: "Code" },
  { name: "Coffee", Icon: Coffee, label: "Coffee" },
  { name: "Compass", Icon: Compass, label: "Travel" },
  { name: "CookingPot", Icon: CookingPot, label: "Cooking" },
  { name: "CreditCard", Icon: CreditCard, label: "Card" },
  { name: "Drop", Icon: Drop, label: "Water" },
  { name: "Egg", Icon: Egg, label: "Egg" },
  { name: "Envelope", Icon: Envelope, label: "Mail" },
  { name: "ForkKnife", Icon: ForkKnife, label: "Meals" },
  { name: "Gauge", Icon: Gauge, label: "Speed" },
  { name: "Heart", Icon: Heart, label: "Heart" },
  { name: "House", Icon: House, label: "Home" },
  { name: "Lightbulb", Icon: Lightbulb, label: "Idea" },
  { name: "ListChecks", Icon: ListChecks, label: "Checklist" },
  { name: "MapPin", Icon: MapPin, label: "Location" },
  { name: "Medal", Icon: Medal, label: "Medal" },
  { name: "MoonStars", Icon: MoonStars, label: "Sleep" },
  { name: "MusicNote", Icon: MusicNote, label: "Music" },
  { name: "NotePencil", Icon: NotePencil, label: "Note" },
  { name: "Notepad", Icon: Notepad, label: "Notepad" },
  { name: "Package", Icon: Package, label: "Package" },
  { name: "Pencil", Icon: Pencil, label: "Pencil" },
  { name: "PiggyBank", Icon: PiggyBank, label: "Savings" },
  { name: "Pill", Icon: Pill, label: "Pill" },
  { name: "Plant", Icon: Plant, label: "Plant" },
  { name: "Smiley", Icon: Smiley, label: "Mood" },
  { name: "SneakerMove", Icon: SneakerMove, label: "Running" },
  { name: "SoccerBall", Icon: SoccerBall, label: "Soccer" },
  { name: "Star", Icon: Star, label: "Star" },
  { name: "Sun", Icon: Sun, label: "Sun" },
  { name: "Target", Icon: Target, label: "Target" },
  { name: "TestTube", Icon: TestTube, label: "Lab" },
  { name: "Timer", Icon: Timer, label: "Timer" },
  { name: "Trophy", Icon: Trophy, label: "Trophy" },
  { name: "User", Icon: User, label: "User" },
  { name: "UsersThree", Icon: UsersThree, label: "Team" },
  { name: "Wallet", Icon: Wallet, label: "Wallet" },
  { name: "Wrench", Icon: Wrench, label: "Tool" },
];

const ICON_INDEX: Record<string, Icon> = Object.fromEntries(
  MODULE_ICONS.map((s) => [s.name, s.Icon]),
);

/** Resolve a profile.icon string to a renderable. Returns null if no icon. */
export function ModuleIcon({
  icon,
  size = 18,
  weight = "regular",
  className,
}: {
  icon: string | null | undefined;
  size?: number;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  className?: string;
}): ReactNode {
  if (!icon) return null;
  if (icon.startsWith("ph:")) {
    const Iconish = ICON_INDEX[icon.slice(3)];
    if (Iconish) {
      return <Iconish size={size} weight={weight} className={className} />;
    }
  }
  // Legacy / emoji / any other string — render as text.
  return <span className={className}>{icon}</span>;
}

export function IconPicker({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (next: string | undefined) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q
    ? MODULE_ICONS.filter(
        (s) =>
          s.label.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q),
      )
    : MODULE_ICONS;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search icons (e.g. heart, run)"
          className="flex-1 bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
        />
        {value && (
          <button
            onClick={() => onChange(undefined)}
            className="text-[11px] text-ink-faint hover:text-ink transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      <div className="grid grid-cols-8 gap-1 max-h-64 overflow-auto rounded border border-rule p-2 bg-rule/10">
        {filtered.map(({ name, Icon }) => {
          const token = `ph:${name}`;
          const active = value === token;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(token)}
              title={name}
              className={`flex items-center justify-center h-8 w-8 rounded border transition-colors ${
                active
                  ? "border-ink bg-ink text-paper"
                  : "border-transparent text-ink-muted hover:border-rule hover:text-ink"
              }`}
            >
              <Icon size={16} weight="regular" />
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-8 py-6 text-center text-[11px] text-ink-faint">
            No icons match.
          </div>
        )}
      </div>
    </div>
  );
}
