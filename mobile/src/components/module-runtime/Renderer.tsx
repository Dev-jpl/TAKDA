import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { type, useTheme, type ThemeColors } from "@/lib/theme";
import type {
  Binding,
  Collection,
  Element,
  Field,
  LayoutNode,
  Module,
  Screen as MdlScreen,
} from "@/lib/module-runtime/types";
import {
  createEntry,
  listEntries,
  setSingletonEntry,
} from "@/lib/store";

// ─── Renderer entry point ───────────────────────────────────────────────────
//
// Renders one screen of a Module against local entry state. The renderer is
// deliberately small — it implements only the element kinds the calorie
// tracker needs today. New element types are added one switch-case at a
// time as more modules ship.

type FormState = Record<string, unknown>; // key = `${collectionId}::${fieldId}`

function fieldKey(collectionId: string, fieldId: string): string {
  return `${collectionId}::${fieldId}`;
}

// ─── Shared calorie-goal calculator ─────────────────────────────────────────
// Mifflin-St Jeor BMR → TDEE via activity factor → mode shift → macros.
// Used by both the live preview element and the compute_calorie_goals
// button action so they always agree.

export interface CalorieGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function computeCalorieGoals(input: {
  weight: number; // kg
  height: number; // cm
  age: number; // years
  sex: string; // "male" | "female"
  activity: string; // sedentary | light | moderate | active | very_active
  mode: string; // deficit | maintenance | surplus
}): CalorieGoals {
  const { weight, height, age, sex, activity, mode } = input;
  if (weight <= 0 || height <= 0 || age <= 0) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }
  const bmr =
    sex === "female"
      ? 10 * weight + 6.25 * height - 5 * age - 161
      : 10 * weight + 6.25 * height - 5 * age + 5;
  const activityFactor: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  const tdee = bmr * (activityFactor[activity] ?? 1.55);
  const shift = mode === "surplus" ? 500 : mode === "deficit" ? -500 : 0;
  const calories = Math.max(0, Math.round(tdee + shift));
  const proteinPerKg =
    mode === "deficit" ? 2.0 : mode === "surplus" ? 1.6 : 1.8;
  const protein = Math.max(0, Math.round(weight * proteinPerKg));
  const fat = Math.max(0, Math.round((calories * 0.25) / 9));
  const carbs = Math.max(
    0,
    Math.round((calories - protein * 4 - fat * 9) / 4),
  );
  return { calories, protein, carbs, fat };
}

export function ModuleRenderer({
  module,
  screenKey,
  moduleInstanceId,
  onSaved,
}: {
  module: Module;
  screenKey?: string;
  /** ID of the on-device `modules` row this renderer is bound to — any
   *  entries it writes target this install. */
  moduleInstanceId: string;
  /** Called after a successful `save_entry`. Used by modal hosts to
   *  dismiss the sheet automatically once the form commits. */
  onSaved?: () => void;
}) {
  const t = useTheme();
  const styles = useStyles(t);
  const screen: MdlScreen | undefined = useMemo(() => {
    if (screenKey) return module.screens.find((s) => s.key === screenKey);
    const def = module.defaultScreenKey;
    const fromDefault = def
      ? module.screens.find((s) => s.key === def)
      : undefined;
    return fromDefault ?? module.screens[0];
  }, [module, screenKey]);

  const [form, setForm] = useState<FormState>({});
  // Bump to force aggregate widgets (stat, progress) to refetch entries
  // after a save. Cheap; only the bound widgets re-render.
  const [entriesVersion, setEntriesVersion] = useState(0);

  // Pre-fill singletons (e.g. the daily-goal field on the settings screen).
  useEffect(() => {
    if (!screen) return;
    const ids = collectSingletonCollectionsUsed(screen.root, module);
    if (ids.length === 0) return;
    let cancelled = false;
    Promise.all(
      ids.map((cid) => listEntries(moduleInstanceId, cid).then((es) => ({ cid, es }))),
    ).then((results) => {
      if (cancelled) return;
      const seed: FormState = {};
      for (const { cid, es } of results) {
        const last = es[0];
        if (!last) continue;
        for (const [fid, value] of Object.entries(last.values)) {
          seed[fieldKey(cid, fid)] = value;
        }
      }
      setForm((prev) => ({ ...seed, ...prev }));
    });
    return () => {
      cancelled = true;
    };
  }, [screen, module, moduleInstanceId]);

  const onAction = useCallback(
    async (action: string, params?: Record<string, unknown>) => {
      // Calorie-tracker-style auto goal calculator. Reads body metrics from
      // the current form, computes TDEE via Mifflin-St Jeor + activity
      // factor, applies the surplus/maintenance/deficit shift, splits into
      // protein/carbs/fat, then writes everything (body metrics + goals)
      // to the configured singleton.
      //
      // The button's config carries the wiring so this stays a generic
      // action — the renderer doesn't hard-code field IDs.
      if (action === "compute_calorie_goals") {
        const cfg = params ?? {};
        const targetCollectionId = (cfg.targetCollectionId as string) ?? "";
        const targetColl = module.collections.find(
          (c) => c.id === targetCollectionId,
        );
        if (!targetColl) return;
        const fk = (id: unknown) =>
          typeof id === "string" ? fieldKey(targetCollectionId, id) : "";
        const num = (id: unknown): number => {
          const k = fk(id);
          const v = form[k];
          if (typeof v === "number") return v;
          if (typeof v === "string" && v !== "") {
            const n = Number(v);
            return Number.isNaN(n) ? 0 : n;
          }
          return 0;
        };
        const str = (id: unknown, fallback: string): string => {
          const k = fk(id);
          const v = form[k];
          return typeof v === "string" && v !== "" ? v : fallback;
        };
        const goals = computeCalorieGoals({
          weight: num(cfg.weightFieldId),
          height: num(cfg.heightFieldId),
          age: num(cfg.ageFieldId),
          sex: str(cfg.sexFieldId, "male"),
          activity: str(cfg.activityFieldId, "moderate"),
          mode: str(cfg.modeFieldId, "maintenance"),
        });

        const values: Record<string, unknown> = {
          // Persist the body metrics so they pre-fill next time.
          [cfg.weightFieldId as string]: num(cfg.weightFieldId),
          [cfg.heightFieldId as string]: num(cfg.heightFieldId),
          [cfg.ageFieldId as string]: num(cfg.ageFieldId),
          [cfg.sexFieldId as string]: str(cfg.sexFieldId, "male"),
          [cfg.activityFieldId as string]: str(cfg.activityFieldId, "moderate"),
          [cfg.modeFieldId as string]: str(cfg.modeFieldId, "maintenance"),
          // The four computed goals.
          [cfg.calorieGoalFieldId as string]: goals.calories,
          [cfg.proteinGoalFieldId as string]: goals.protein,
          [cfg.carbsGoalFieldId as string]: goals.carbs,
          [cfg.fatGoalFieldId as string]: goals.fat,
        };
        await setSingletonEntry({
          moduleId: moduleInstanceId,
          collectionId: targetCollectionId,
          values,
        });
        setEntriesVersion((v) => v + 1);
        onSaved?.();
        return;
      }

      if (action !== "save_entry") return;
      // Group dirty values by collection. Singleton collections upsert;
      // regular collections insert a new row.
      const perColl = new Map<string, Record<string, unknown>>();
      for (const [k, v] of Object.entries(form)) {
        if (v === undefined || v === null || v === "") continue;
        const [cid, fid] = k.split("::");
        if (!cid || !fid) continue;
        const bag = perColl.get(cid) ?? {};
        bag[fid] = v;
        perColl.set(cid, bag);
      }
      for (const [cid, values] of perColl) {
        const coll = module.collections.find((c) => c.id === cid);
        if (!coll) continue;
        if (coll.singleton) {
          await setSingletonEntry({
            moduleId: moduleInstanceId,
            collectionId: cid,
            values,
          });
        } else {
          await createEntry({
            moduleId: moduleInstanceId,
            collectionId: cid,
            values,
          });
        }
      }
      // Clear non-singleton form keys so the next entry starts blank,
      // but keep singleton values so the form continues to reflect them.
      setForm((prev) => {
        const next: FormState = {};
        for (const [k, v] of Object.entries(prev)) {
          const [cid] = k.split("::");
          const coll = module.collections.find((c) => c.id === cid);
          if (coll?.singleton) next[k] = v;
        }
        return next;
      });
      setEntriesVersion((v) => v + 1);
      onSaved?.();
    },
    [form, module, moduleInstanceId, onSaved],
  );

  if (!screen) {
    return (
      <Text style={[styles.empty, { color: t.inkMuted }]}>
        Screen not found.
      </Text>
    );
  }

  return (
    <RenderNode
      node={screen.root}
      module={module}
      moduleInstanceId={moduleInstanceId}
      form={form}
      setForm={setForm}
      onAction={onAction}
      entriesVersion={entriesVersion}
    />
  );
}

interface NodeProps {
  node: LayoutNode;
  module: Module;
  moduleInstanceId: string;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onAction: (action: string, params?: Record<string, unknown>) => void;
  entriesVersion: number;
}

function RenderNode(p: NodeProps) {
  if (p.node.kind === "container") {
    const c = p.node;
    const isRow = c.direction === "row";
    return (
      <ContainerView container={c} isRow={isRow}>
        {c.children.map((child) => (
          // Row containers distribute child width evenly by default — the
          // common mobile case (stat tiles, button rows). Add a `grow`
          // config to override this once we need finer control.
          <View key={child.id} style={isRow ? { flex: 1 } : undefined}>
            <RenderNode {...p} node={child} />
          </View>
        ))}
      </ContainerView>
    );
  }
  return <RenderElement {...p} element={p.node as Element} />;
}

// Container shell. Default is a bare flex View; `card: true` turns it into
// a paper-on-rule bordered tile so individual modules don't need to know
// the theme tokens.
function ContainerView({
  container,
  isRow,
  children,
}: {
  container: { card?: boolean; gap?: number; padding?: number };
  isRow: boolean;
  children: React.ReactNode;
}) {
  const t = useTheme();
  const base = {
    flexDirection: isRow ? "row" : "column",
    gap: container.gap ?? 12,
  } as const;
  if (container.card) {
    return (
      <View
        style={{
          ...base,
          padding: container.padding ?? 14,
          backgroundColor: t.paper,
          borderWidth: 1,
          borderColor: t.rule,
          borderRadius: 10,
        }}
      >
        {children}
      </View>
    );
  }
  return (
    <View style={{ ...base, padding: container.padding ?? 0 }}>{children}</View>
  );
}

function RenderElement(p: NodeProps & { element: Element }) {
  const { element, module, moduleInstanceId, form, setForm, onAction, entriesVersion } = p;
  const t = useTheme();
  const styles = useStyles(t);
  const cfg = (element.config ?? {}) as Record<string, unknown>;

  switch (element.type) {
    case "heading": {
      const size = (cfg.size as string) ?? "lg";
      return (
        <Text
          style={[
            styles.heading,
            size === "xl" && { fontSize: 28 },
            size === "md" && { fontSize: 18 },
            { color: t.ink },
          ]}
        >
          {(cfg.text as string) ?? "Heading"}
        </Text>
      );
    }
    case "paragraph":
      return (
        <Text style={[styles.paragraph, { color: t.inkMuted }]}>
          {(cfg.text as string) ?? ""}
        </Text>
      );
    case "divider":
      return <View style={[styles.divider, { backgroundColor: t.rule }]} />;
    case "spacer":
      return <View style={{ height: (cfg.size as number) ?? 16 }} />;
    case "text_input":
    case "number_input": {
      const fb = element.binding?.kind === "field" ? element.binding : null;
      const field = fb ? findField(module, fb.collectionId, fb.fieldId) : null;
      const k = fb ? fieldKey(fb.collectionId, fb.fieldId) : null;
      const value = k ? (form[k] as string | number | undefined) : undefined;
      return (
        <View>
          {field && (
            <Text style={[styles.fieldLabel, { color: t.inkFaint }]}>
              {field.label}
              {field.unit ? ` (${field.unit})` : ""}
            </Text>
          )}
          <TextInput
            style={[styles.input, { color: t.ink, borderColor: t.rule }]}
            value={value === undefined || value === null ? "" : String(value)}
            onChangeText={(raw) => {
              if (!k) return;
              setForm((prev) => {
                if (element.type === "number_input") {
                  if (raw === "") return { ...prev, [k]: null };
                  const n = Number(raw);
                  return { ...prev, [k]: Number.isNaN(n) ? raw : n };
                }
                return { ...prev, [k]: raw };
              });
            }}
            placeholder={(cfg.placeholder as string) ?? ""}
            placeholderTextColor={t.inkFaint}
            keyboardType={element.type === "number_input" ? "decimal-pad" : "default"}
          />
        </View>
      );
    }
    case "select_input": {
      const fb = element.binding?.kind === "field" ? element.binding : null;
      const field = fb ? findField(module, fb.collectionId, fb.fieldId) : null;
      const k = fb ? fieldKey(fb.collectionId, fb.fieldId) : null;
      const value = k ? (form[k] as string | undefined) : undefined;
      const options = field?.options ?? [];
      return (
        <View>
          {field && (
            <Text style={[styles.fieldLabel, { color: t.inkFaint }]}>
              {field.label}
            </Text>
          )}
          <View style={styles.pillsRow}>
            {options.map((opt) => {
              const active = value === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    if (!k) return;
                    setForm((prev) => ({ ...prev, [k]: opt.value }));
                  }}
                  style={({ pressed }) => [
                    styles.pill,
                    {
                      borderColor: t.rule,
                      backgroundColor: active ? t.ink : "transparent",
                    },
                    pressed && !active && { backgroundColor: t.rule },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillLabel,
                      { color: active ? t.paper : t.inkMuted },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }
    case "button": {
      const action = (cfg.action as string) ?? "save_entry";
      const label = (cfg.text as string) ?? "Save";
      // Secondary visual style — outlined, ink text on paper. Lets a screen
      // have a primary save + a secondary "calculate" without both screaming.
      const variant = (cfg.variant as string) ?? "primary";
      const isSecondary = variant === "secondary";
      return (
        <Pressable
          onPress={() => onAction(action, cfg)}
          style={({ pressed }) => [
            styles.button,
            isSecondary
              ? { borderWidth: 1, borderColor: t.rule, backgroundColor: t.paper }
              : { backgroundColor: t.ink },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text
            style={[
              styles.buttonLabel,
              { color: isSecondary ? t.ink : t.paper },
            ]}
          >
            {label}
          </Text>
        </Pressable>
      );
    }
    case "stat":
      return (
        <Stat
          element={element}
          module={module}
          moduleInstanceId={moduleInstanceId}
          entriesVersion={entriesVersion}
        />
      );
    case "progress_bar":
      return (
        <ProgressBar
          element={element}
          module={module}
          moduleInstanceId={moduleInstanceId}
          entriesVersion={entriesVersion}
        />
      );
    case "list":
      return (
        <List
          element={element}
          module={module}
          moduleInstanceId={moduleInstanceId}
          entriesVersion={entriesVersion}
        />
      );
    case "goal_preview":
      return <GoalPreview element={element} form={form} />;
    default:
      return (
        <Text style={[styles.empty, { color: t.inkFaint }]}>
          [{element.type} not yet supported]
        </Text>
      );
  }
}

// ─── Aggregate widgets ──────────────────────────────────────────────────────

function useTodaySum(
  moduleInstanceId: string,
  collectionId: string,
  fieldId: string,
  entriesVersion: number,
): number {
  const [sum, setSum] = useState(0);
  useEffect(() => {
    let cancelled = false;
    listEntries(moduleInstanceId, collectionId).then((es) => {
      if (cancelled) return;
      const today = new Date().toDateString();
      let total = 0;
      for (const e of es) {
        if (new Date(e.createdAt).toDateString() !== today) continue;
        const v = e.values[fieldId];
        if (typeof v === "number") total += v;
        else if (typeof v === "string" && v.trim() !== "") {
          const n = Number(v);
          if (!Number.isNaN(n)) total += n;
        }
      }
      setSum(total);
    });
    return () => {
      cancelled = true;
    };
  }, [moduleInstanceId, collectionId, fieldId, entriesVersion]);
  return sum;
}

function useSingletonValue(
  moduleInstanceId: string,
  collectionId: string,
  fieldId: string,
  entriesVersion: number,
): number | null {
  const [v, setV] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    listEntries(moduleInstanceId, collectionId).then((es) => {
      if (cancelled) return;
      const raw = es[0]?.values[fieldId];
      if (typeof raw === "number") setV(raw);
      else if (typeof raw === "string") {
        const n = Number(raw);
        setV(Number.isNaN(n) ? null : n);
      } else setV(null);
    });
    return () => {
      cancelled = true;
    };
  }, [moduleInstanceId, collectionId, fieldId, entriesVersion]);
  return v;
}

function Stat({
  element,
  module: _module,
  moduleInstanceId,
  entriesVersion,
}: {
  element: Element;
  module: Module;
  moduleInstanceId: string;
  entriesVersion: number;
}) {
  const t = useTheme();
  const styles = useStyles(t);
  const cfg = element.config ?? {};
  const fb = element.binding?.kind === "field" ? element.binding : null;
  const sum = useTodaySum(
    moduleInstanceId,
    fb?.collectionId ?? "",
    fb?.fieldId ?? "",
    entriesVersion,
  );
  const label = (cfg.label as string) ?? "Today";
  const unit = (cfg.unit as string) ?? "";
  // Size lever: "lg" (default) is the hero stat; "md" and "sm" shrink for
  // secondary tiles like macro readouts under the calorie hero.
  const size = (cfg.size as string) ?? "lg";
  const valueStyle =
    size === "sm"
      ? styles.statValueSm
      : size === "md"
        ? styles.statValueMd
        : styles.statValue;
  const unitStyle =
    size === "sm" ? styles.statUnitSm : styles.statUnit;
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: t.inkFaint }]}>{label}</Text>
      <Text style={[valueStyle, { color: t.ink }]}>
        {formatNum(sum)}
        {unit ? <Text style={[unitStyle, { color: t.inkMuted }]}>{` ${unit}`}</Text> : null}
      </Text>
    </View>
  );
}

function ProgressBar({
  element,
  module: _module,
  moduleInstanceId,
  entriesVersion,
}: {
  element: Element;
  module: Module;
  moduleInstanceId: string;
  entriesVersion: number;
}) {
  const t = useTheme();
  const styles = useStyles(t);
  const cfg = element.config ?? {};
  const fb = element.binding?.kind === "field" ? element.binding : null;
  const sum = useTodaySum(
    moduleInstanceId,
    fb?.collectionId ?? "",
    fb?.fieldId ?? "",
    entriesVersion,
  );
  const goal = useSingletonValue(
    moduleInstanceId,
    (cfg.goalCollectionId as string) ?? "",
    (cfg.goalFieldId as string) ?? "",
    entriesVersion,
  );
  const label = (cfg.label as string) ?? "Progress";
  const unit = (cfg.unit as string) ?? "";
  // Compact variant: drops the label row + hint, halves track height. Used
  // for secondary metrics that sit under their own stat tile.
  const compact = cfg.size === "sm";
  const denom = goal && goal > 0 ? goal : 0;
  const pct = denom > 0 ? Math.min(1, sum / denom) : 0;

  return (
    <View style={{ gap: compact ? 0 : 6 }}>
      {!compact && (
        <View style={styles.progressRow}>
          <Text style={[styles.progressLabel, { color: t.inkMuted }]}>
            {label}
          </Text>
          <Text style={[styles.progressLabel, { color: t.inkMuted }]}>
            {formatNum(sum)}
            {denom > 0 ? ` / ${formatNum(denom)}` : ""}
            {unit ? ` ${unit}` : ""}
          </Text>
        </View>
      )}
      <View
        style={[
          compact ? styles.progressTrackSm : styles.progressTrack,
          { backgroundColor: t.rule },
        ]}
        accessibilityRole="progressbar"
      >
        <View
          style={[
            styles.progressFill,
            { backgroundColor: t.ink, width: `${pct * 100}%` },
          ]}
        />
      </View>
      {!compact && denom === 0 && (
        <Text style={[styles.fieldLabel, { color: t.inkFaint }]}>
          Set a daily goal in the Goal screen.
        </Text>
      )}
    </View>
  );
}

// ─── List of bound entries ──────────────────────────────────────────────────
// Resolves a collection binding, fetches entries, optionally filters to
// today, then renders each as a row with title/subtitle from config.

function List({
  element,
  module,
  moduleInstanceId,
  entriesVersion,
}: {
  element: Element;
  module: Module;
  moduleInstanceId: string;
  entriesVersion: number;
}) {
  const t = useTheme();
  const styles = useStyles(t);
  const cfg = element.config ?? {};
  // Accept either a collection binding or a field binding (we only use the
  // collection id from either form).
  const collectionId =
    element.binding?.kind === "collection"
      ? element.binding.collectionId
      : element.binding?.kind === "field"
        ? element.binding.collectionId
        : "";
  const titleFieldId = (cfg.titleFieldId as string) ?? "";
  const subtitleFieldId = (cfg.subtitleFieldId as string) ?? "";
  const unit = (cfg.unit as string) ?? "";
  const window = (cfg.window as string) ?? "today";
  const empty = (cfg.emptyText as string) ?? "Nothing yet.";

  const [rows, setRows] = useState<{ id: string; title: string; subtitle: string }[]>(
    [],
  );

  useEffect(() => {
    if (!collectionId) return;
    let cancelled = false;
    listEntries(moduleInstanceId, collectionId).then((es) => {
      if (cancelled) return;
      const filtered =
        window === "today"
          ? es.filter(
              (e) => new Date(e.createdAt).toDateString() === new Date().toDateString(),
            )
          : es;
      setRows(
        filtered.map((e) => {
          const titleRaw = titleFieldId ? e.values[titleFieldId] : undefined;
          const subRaw = subtitleFieldId ? e.values[subtitleFieldId] : undefined;
          const title =
            typeof titleRaw === "string" || typeof titleRaw === "number"
              ? String(titleRaw)
              : "—";
          const subtitle =
            typeof subRaw === "number" || (typeof subRaw === "string" && subRaw !== "")
              ? `${subRaw}${unit ? ` ${unit}` : ""}`
              : "";
          return { id: e.id, title, subtitle };
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [collectionId, moduleInstanceId, titleFieldId, subtitleFieldId, window, unit, entriesVersion]);

  if (rows.length === 0) {
    return <Text style={[styles.empty, { color: t.inkFaint }]}>{empty}</Text>;
  }

  return (
    <View style={styles.listWrap}>
      {rows.map((r, idx) => (
        <View key={r.id}>
          {idx > 0 && <View style={[styles.listSep, { backgroundColor: t.rule }]} />}
          <View style={styles.listRow}>
            <Text style={[styles.listTitle, { color: t.ink }]} numberOfLines={1}>
              {r.title}
            </Text>
            {!!r.subtitle && (
              <Text style={[styles.listSub, { color: t.inkMuted }]}>
                {r.subtitle}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Goal preview ──────────────────────────────────────────────────────────
// Live readout of the calorie/macro goals the calculator WOULD save with the
// current form values. Re-renders on every form change (it's a child of the
// renderer, so React handles that for free).

function GoalPreview({
  element,
  form,
}: {
  element: Element;
  form: FormState;
}) {
  const t = useTheme();
  const styles = useStyles(t);
  const cfg = element.config ?? {};
  const targetCollectionId = (cfg.targetCollectionId as string) ?? "";
  const fk = (fieldId: unknown) =>
    typeof fieldId === "string" ? fieldKey(targetCollectionId, fieldId) : "";
  const num = (id: unknown): number => {
    const k = fk(id);
    const v = form[k];
    if (typeof v === "number") return v;
    if (typeof v === "string" && v !== "") {
      const n = Number(v);
      return Number.isNaN(n) ? 0 : n;
    }
    return 0;
  };
  const str = (id: unknown, fallback: string): string => {
    const k = fk(id);
    const v = form[k];
    return typeof v === "string" && v !== "" ? v : fallback;
  };
  const goals = computeCalorieGoals({
    weight: num(cfg.weightFieldId),
    height: num(cfg.heightFieldId),
    age: num(cfg.ageFieldId),
    sex: str(cfg.sexFieldId, "male"),
    activity: str(cfg.activityFieldId, "moderate"),
    mode: str(cfg.modeFieldId, "maintenance"),
  });
  const ready = goals.calories > 0;

  return (
    <View
      style={[
        styles.previewCard,
        { borderColor: t.rule, backgroundColor: t.paper },
      ]}
    >
      <Text style={[styles.fieldLabel, { color: t.inkFaint }]}>
        {ready ? "Calculated goals" : "Fill body metrics to preview"}
      </Text>
      <View style={styles.previewBigRow}>
        <Text style={[styles.previewBig, { color: t.ink }]}>
          {ready ? goals.calories.toLocaleString() : "—"}
          <Text style={[styles.previewBigUnit, { color: t.inkMuted }]}>
            {" kcal"}
          </Text>
        </Text>
      </View>
      <View style={styles.previewMacrosRow}>
        <PreviewMacro label="Protein" value={ready ? goals.protein : null} />
        <PreviewMacro label="Carbs" value={ready ? goals.carbs : null} />
        <PreviewMacro label="Fat" value={ready ? goals.fat : null} />
      </View>
    </View>
  );
}

function PreviewMacro({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  const t = useTheme();
  const styles = useStyles(t);
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.previewMacroLabel, { color: t.inkFaint }]}>
        {label}
      </Text>
      <Text style={[styles.previewMacroValue, { color: t.ink }]}>
        {value === null ? "—" : `${value}`}
        <Text style={[styles.previewBigUnit, { color: t.inkMuted }]}> g</Text>
      </Text>
    </View>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function findField(
  module: Module,
  collectionId: string,
  fieldId: string,
): Field | null {
  const c = module.collections.find((c) => c.id === collectionId);
  if (!c) return null;
  return c.fields.find((f) => f.id === fieldId) ?? null;
}

function collectSingletonCollectionsUsed(
  node: LayoutNode,
  module: Module,
): string[] {
  const out = new Set<string>();
  const walk = (n: LayoutNode) => {
    if (n.kind === "container") {
      for (const c of n.children) walk(c);
      return;
    }
    const b = n.binding as Binding | undefined;
    if (!b || b.kind !== "field") return;
    const coll = module.collections.find((c) => c.id === b.collectionId);
    if (coll?.singleton) out.add(coll.id);
  };
  walk(node);
  return Array.from(out);
}

function formatNum(n: number): string {
  if (n === 0) return "0";
  if (n >= 1000) return n.toLocaleString();
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function useStyles(_t: ThemeColors) {
  return StyleSheet.create({
    heading: { ...type.title, fontSize: 20 },
    paragraph: { ...type.body, fontSize: 14 },
    divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
    fieldLabel: { ...type.eyebrow, fontSize: 10, letterSpacing: 1.4, marginBottom: 6 },
    input: {
      ...type.body,
      fontSize: 16,
      borderBottomWidth: 1,
      paddingVertical: 8,
    },
    button: {
      paddingVertical: 14,
      borderRadius: 6,
      alignItems: "center",
    },
    buttonLabel: { ...type.title, fontSize: 15 },
    statValue: { ...type.stat },
    statValueMd: { ...type.stat, fontSize: 22 },
    statValueSm: { ...type.stat, fontSize: 18 },
    statUnit: { ...type.body, fontSize: 14 },
    statUnitSm: { ...type.body, fontSize: 11 },
    progressRow: { flexDirection: "row", justifyContent: "space-between" },
    progressLabel: { ...type.label, fontSize: 12 },
    progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
    progressTrackSm: { height: 4, borderRadius: 2, overflow: "hidden" },
    progressFill: { height: "100%" },
    empty: { ...type.label, fontSize: 13 },
    listWrap: {},
    listRow: {
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    listTitle: { ...type.body, flex: 1 },
    listSub: { ...type.body, fontSize: 13 },
    listSep: { height: StyleSheet.hairlineWidth },
    pillsRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
    pill: {
      borderWidth: 1,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    pillLabel: { ...type.label, fontSize: 12, fontWeight: "500" },
    previewCard: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 14,
      gap: 8,
    },
    previewBigRow: { flexDirection: "row", alignItems: "baseline" },
    previewBig: { ...type.stat, fontSize: 26 },
    previewBigUnit: { ...type.body, fontSize: 13, fontWeight: "400" },
    previewMacrosRow: { flexDirection: "row", gap: 12, marginTop: 4 },
    previewMacroLabel: {
      ...type.eyebrow,
      fontSize: 9,
      letterSpacing: 1.2,
      marginBottom: 2,
    },
    previewMacroValue: { ...type.stat, fontSize: 16 },
  });
}
