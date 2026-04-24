"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  CaretLeftIcon,
  CaretRightIcon,
  PlusIcon,
  TrashIcon,
  ForkKnifeIcon,
  XIcon,
} from '@phosphor-icons/react';
import { getFoodLogs, logFood, deleteFoodLog, FoodLog } from '@/services/addons.service';

const MEALS = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch',     label: 'Lunch' },
  { id: 'dinner',    label: 'Dinner' },
  { id: 'snack',     label: 'Snacks' },
] as const;

type MealId = typeof MEALS[number]['id'];

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(d: string) {
  const date = new Date(d + 'T12:00:00');
  const today = todayStr();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  if (d === today) return 'Today';
  if (d === yesterdayStr) return 'Yesterday';
  return date.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' });
}

function offsetDate(base: string, days: number) {
  const d = new Date(base + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

interface AddFoodFormProps {
  mealId: MealId;
  hubId: string;
  userId: string;
  date: string;
  onAdded: (log: FoodLog) => void;
  onClose: () => void;
}

function AddFoodForm({ mealId, hubId, userId, date, onAdded, onClose }: AddFoodFormProps) {
  const [name, setName]         = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein]   = useState('');
  const [carbs, setCarbs]       = useState('');
  const [fat, setFat]           = useState('');
  const [saving, setSaving]     = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const entry = await logFood(hubId, {
        user_id: userId,
        food_name: name.trim(),
        calories:  calories  ? parseFloat(calories)  : undefined,
        protein_g: protein   ? parseFloat(protein)   : undefined,
        carbs_g:   carbs     ? parseFloat(carbs)     : undefined,
        fat_g:     fat       ? parseFloat(fat)       : undefined,
        meal_type: mealId,
        logged_at: date + 'T12:00:00Z',
      });
      onAdded(entry);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2 bg-background-primary border border-border-primary rounded-xl p-3 flex flex-col gap-2">
      <input
        autoFocus
        placeholder="Food name"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
        className="text-sm bg-background-tertiary border border-border-primary rounded-lg px-3 py-2 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-primary/60 w-full"
      />
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: 'Calories', val: calories, set: setCalories, unit: 'kcal' },
          { label: 'Protein',  val: protein,  set: setProtein,  unit: 'g' },
          { label: 'Carbs',    val: carbs,    set: setCarbs,    unit: 'g' },
          { label: 'Fat',      val: fat,      set: setFat,      unit: 'g' },
        ].map(f => (
          <div key={f.label} className="flex flex-col gap-0.5">
            <label className="text-[9px] font-bold text-text-tertiary uppercase tracking-wide">{f.label}</label>
            <input
              type="number"
              placeholder={f.unit}
              value={f.val}
              onChange={e => f.set(e.target.value)}
              className="text-xs bg-background-tertiary border border-border-primary rounded-lg px-2 py-1.5 text-text-primary placeholder:text-text-tertiary/50 focus:outline-none w-full"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2">
        <button onClick={onClose} className="text-xs text-text-tertiary hover:text-text-primary px-3 py-1.5">Cancel</button>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="text-xs font-bold bg-[#22c55e] text-white px-4 py-1.5 rounded-lg disabled:opacity-40"
        >
          {saving ? 'Adding…' : 'Add'}
        </button>
      </div>
    </div>
  );
}

interface Props {
  hubId: string;
  userId: string;
  config: Record<string, unknown>;
}

export function CalorieCounterAddon({ hubId, userId, config }: Props) {
  const calorieGoal  = Number(config.calorie_goal  ?? 2000);
  const proteinGoal  = Number(config.protein_goal  ?? 150);
  const carbsGoal    = Number(config.carbs_goal    ?? 250);
  const fatGoal      = Number(config.fat_goal      ?? 65);

  const [logs, setLogs]     = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate]       = useState(todayStr());
  const [openForm, setOpenForm] = useState<MealId | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLogs(await getFoodLogs(hubId, date, userId));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [hubId, date, userId]);

  useEffect(() => { load(); }, [load]);

  // ── Totals ──────────────────────────────────────────────────────────────
  const totalCal     = logs.reduce((s, l) => s + (l.calories  ?? 0), 0);
  const totalProtein = logs.reduce((s, l) => s + (l.protein_g ?? 0), 0);
  const totalCarbs   = logs.reduce((s, l) => s + (l.carbs_g   ?? 0), 0);
  const totalFat     = logs.reduce((s, l) => s + (l.fat_g     ?? 0), 0);
  const remaining    = calorieGoal - totalCal;
  const overBudget   = remaining < 0;
  const calPct       = Math.min((totalCal / calorieGoal) * 100, 100);

  const byMeal = MEALS.reduce<Record<MealId, FoodLog[]>>((acc, m) => {
    acc[m.id] = logs.filter(l => l.meal_type === m.id);
    return acc;
  }, {} as Record<MealId, FoodLog[]>);

  async function handleDelete(id: string) {
    try {
      await deleteFoodLog(id);
      setLogs(prev => prev.filter(l => l.id !== id));
      window.dispatchEvent(new CustomEvent('takda:data_updated'));
    } catch (e) {
      console.error(e);
    }
  }

  function handleAdded(log: FoodLog) {
    setLogs(prev => [...prev, log]);
    setOpenForm(null);
    window.dispatchEvent(new CustomEvent('takda:data_updated'));
  }

  return (
    <div className="flex flex-col gap-0">

      {/* ── Date nav ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => setDate(d => offsetDate(d, -1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-background-tertiary transition-all"
        >
          <CaretLeftIcon size={14} weight="bold" />
        </button>
        <button
          onClick={() => setDate(todayStr())}
          className="text-sm font-bold text-text-primary hover:text-[#22c55e] transition-colors"
        >
          {formatDate(date)}
        </button>
        <button
          onClick={() => setDate(d => offsetDate(d, 1))}
          disabled={date >= todayStr()}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-background-tertiary transition-all disabled:opacity-30 disabled:cursor-default"
        >
          <CaretRightIcon size={14} weight="bold" />
        </button>
      </div>

      {/* ── Calorie summary (MFP-style equation row) ────────────────────── */}
      <div className="bg-background-primary border border-border-primary rounded-xl p-4 mb-4">
        {/* Goal equation */}
        <div className="grid grid-cols-5 gap-2 text-center mb-4">
          <div>
            <p className="text-lg font-bold text-text-primary">{calorieGoal}</p>
            <p className="text-[10px] text-text-tertiary">Goal</p>
          </div>
          <div className="flex items-center justify-center text-text-tertiary text-base font-light">−</div>
          <div>
            <p className="text-lg font-bold text-text-primary">{Math.round(totalCal)}</p>
            <p className="text-[10px] text-text-tertiary">Food</p>
          </div>
          <div className="flex items-center justify-center text-text-tertiary text-base font-light">=</div>
          <div>
            <p className={`text-lg font-bold ${overBudget ? 'text-red-400' : 'text-[#22c55e]'}`}>
              {Math.abs(Math.round(remaining))}
            </p>
            <p className="text-[10px] text-text-tertiary">{overBudget ? 'Over' : 'Left'}</p>
          </div>
        </div>

        {/* Calorie progress bar */}
        <div className="h-2 rounded-full bg-border-primary overflow-hidden mb-4">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${calPct}%`,
              backgroundColor: overBudget ? '#f87171' : '#22c55e',
            }}
          />
        </div>

        {/* Macros */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Protein', val: totalProtein, goal: proteinGoal, color: '#60A5FA' },
            { label: 'Carbs',   val: totalCarbs,   goal: carbsGoal,   color: '#F59E0B' },
            { label: 'Fat',     val: totalFat,     goal: fatGoal,     color: '#EC4899' },
          ].map(m => {
            const pct = Math.min((m.val / m.goal) * 100, 100);
            return (
              <div key={m.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-text-tertiary">{m.label}</span>
                  <span className="text-[10px] font-bold text-text-secondary">
                    {Math.round(m.val)}g <span className="text-text-tertiary font-normal">/ {m.goal}g</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-border-primary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: m.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Meal sections ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="text-center text-text-tertiary text-xs py-10">Loading…</div>
      ) : (
        <div className="flex flex-col gap-3">
          {MEALS.map(meal => {
            const entries = byMeal[meal.id];
            const mealCal = entries.reduce((s, l) => s + (l.calories ?? 0), 0);
            const isOpen  = openForm === meal.id;

            return (
              <div key={meal.id} className="bg-background-primary border border-border-primary rounded-xl overflow-hidden">
                {/* Meal header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
                  <div className="flex items-center gap-2">
                    <ForkKnifeIcon size={13} className="text-text-tertiary" weight="duotone" />
                    <span className="text-sm font-bold text-text-primary">{meal.label}</span>
                  </div>
                  <span className="text-xs font-bold text-text-secondary">
                    {Math.round(mealCal)} <span className="text-text-tertiary font-normal">kcal</span>
                  </span>
                </div>

                {/* Food entries */}
                {entries.length > 0 && (
                  <div className="divide-y divide-border-primary/50">
                    {entries.map(log => (
                      <div key={log.id} className="flex items-center justify-between px-4 py-2.5 group">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-text-primary truncate">{log.food_name}</p>
                          {(log.protein_g != null || log.carbs_g != null || log.fat_g != null) && (
                            <p className="text-[10px] text-text-tertiary mt-0.5">
                              {[
                                log.carbs_g   != null && `Carbs: ${log.carbs_g}g`,
                                log.fat_g     != null && `Fat: ${log.fat_g}g`,
                                log.protein_g != null && `Protein: ${log.protein_g}g`,
                              ].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          {log.calories != null && (
                            <span className="text-xs font-bold text-text-secondary">{log.calories}</span>
                          )}
                          <button
                            onClick={() => handleDelete(log.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-text-tertiary hover:text-red-400"
                          >
                            <TrashIcon size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline add form */}
                <div className="px-3 pb-3 pt-1">
                  {isOpen ? (
                    <AddFoodForm
                      mealId={meal.id}
                      hubId={hubId}
                      userId={userId}
                      date={date}
                      onAdded={handleAdded}
                      onClose={() => setOpenForm(null)}
                    />
                  ) : (
                    <button
                      onClick={() => setOpenForm(meal.id)}
                      className="w-full flex items-center gap-2 text-xs text-text-tertiary hover:text-[#22c55e] transition-colors py-1.5 px-1"
                    >
                      <PlusIcon size={13} weight="bold" />
                      Add Food
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Daily totals footer ─────────────────────────────────────────── */}
      {!loading && logs.length > 0 && (
        <div className="mt-3 bg-background-primary border border-border-primary rounded-xl px-4 py-3">
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-2">Daily Totals</p>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: 'Calories', val: `${Math.round(totalCal)}`, unit: 'kcal' },
              { label: 'Protein',  val: `${Math.round(totalProtein)}`, unit: 'g' },
              { label: 'Carbs',    val: `${Math.round(totalCarbs)}`,   unit: 'g' },
              { label: 'Fat',      val: `${Math.round(totalFat)}`,     unit: 'g' },
            ].map(t => (
              <div key={t.label}>
                <p className="text-sm font-bold text-text-primary">{t.val}<span className="text-[10px] text-text-tertiary font-normal ml-0.5">{t.unit}</span></p>
                <p className="text-[10px] text-text-tertiary">{t.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
