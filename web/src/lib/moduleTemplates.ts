import type { ModuleDefinitionV2 } from '@/types/module-creator';

export interface ModuleTemplate {
  id:          string;
  label:       string;
  description: string;
  icon:        string;       // emoji
  brand_color: string;
  definition:  Pick<ModuleDefinitionV2,
    'schemas' | 'computed_properties' | 'aly_config'
  >;
}

export const MODULE_TEMPLATES: ModuleTemplate[] = [

  // ── Calorie Tracker ─────────────────────────────────────────────────────────
  {
    id:          'calorie_tracker',
    label:       'Calorie Tracker',
    description: 'Log meals with calories and macros, track daily totals.',
    icon:        '🥗',
    brand_color: '#22c55e',
    definition: {
      schemas: {
        food_logs: {
          key: 'food_logs', label: 'Food Log', role: 'primary',
          fields: [
            { key: 'food_name',  label: 'Food',     type: 'text',   required: true,  config: {} },
            { key: 'calories',   label: 'Calories', type: 'number', required: true,  config: { unit: 'kcal', min: 0 } },
            { key: 'protein_g',  label: 'Protein',  type: 'number', required: false, config: { unit: 'g',    min: 0 } },
            { key: 'carbs_g',    label: 'Carbs',    type: 'number', required: false, config: { unit: 'g',    min: 0 } },
            { key: 'fat_g',      label: 'Fat',      type: 'number', required: false, config: { unit: 'g',    min: 0 } },
            { key: 'meal_type',  label: 'Meal',     type: 'select', required: false,
              config: { options: ['Breakfast', 'Lunch', 'Dinner', 'Snack'] } },
            { key: 'logged_at',  label: 'Date',     type: 'date',   required: false, config: {} },
          ],
        },
      },
      computed_properties: [
        { key: 'cal_today',     label: 'Calories Today', type: 'sum', source_field: 'calories', window: 'today', unit: 'kcal', format: 'number', precision: 0, goal_value: 2000 },
        { key: 'protein_today', label: 'Protein Today',  type: 'sum', source_field: 'protein_g', window: 'today', unit: 'g',    format: 'number', precision: 0 },
        { key: 'carbs_today',   label: 'Carbs Today',    type: 'sum', source_field: 'carbs_g',   window: 'today', unit: 'g',    format: 'number', precision: 0 },
      ],
      aly_config: {
        intent_keywords: ['calorie', 'calories', 'food', 'meal', 'ate', 'eat', 'lunch', 'dinner', 'breakfast', 'snack', 'kcal'],
        context_hint:    'This module tracks daily calorie and macro intake. The user logs meals throughout the day.',
        log_prompt:      'log 450 calories of grilled chicken for lunch',
        proactive_insights: [],
      } as any,
    },
  },

  // ── Expense Logger ───────────────────────────────────────────────────────────
  {
    id:          'expense_logger',
    label:       'Expense Logger',
    description: 'Track spending by category, see daily and monthly totals.',
    icon:        '💸',
    brand_color: '#f59e0b',
    definition: {
      schemas: {
        expenses: {
          key: 'expenses', label: 'Expenses', role: 'primary',
          fields: [
            { key: 'merchant',    label: 'Merchant',  type: 'text',   required: true,  config: {} },
            { key: 'amount',      label: 'Amount',    type: 'number', required: true,  config: { unit: '₱', min: 0 } },
            { key: 'category',    label: 'Category',  type: 'select', required: false,
              config: { options: ['Food', 'Transport', 'Bills', 'Shopping', 'Health', 'Entertainment', 'Other'] } },
            { key: 'note',        label: 'Note',      type: 'text',   required: false, config: {} },
            { key: 'spent_at',    label: 'Date',      type: 'date',   required: false, config: {} },
          ],
        },
      },
      computed_properties: [
        { key: 'spent_today',  label: 'Spent Today',    type: 'sum', source_field: 'amount', window: 'today',    unit: '₱', format: 'number', precision: 0 },
        { key: 'spent_week',   label: 'Spent This Week', type: 'sum', source_field: 'amount', window: 'last_7d', unit: '₱', format: 'number', precision: 0 },
        { key: 'spent_month',  label: 'Spent This Month', type: 'sum', source_field: 'amount', window: 'month',  unit: '₱', format: 'number', precision: 0 },
      ],
      aly_config: {
        intent_keywords: ['spent', 'expense', 'bought', 'paid', 'cost', 'purchase', 'money', 'piso', 'peso'],
        context_hint:    'This module tracks daily expenses. The user logs purchases and spending with amounts and categories.',
        log_prompt:      'spent 150 on lunch at Jollibee',
        proactive_insights: [],
      } as any,
    },
  },

  // ── Habit Tracker ─────────────────────────────────────────────────────────────
  {
    id:          'habit_tracker',
    label:       'Habit Tracker',
    description: 'Log daily habits, build streaks, see completion rates.',
    icon:        '✅',
    brand_color: '#6366f1',
    definition: {
      schemas: {
        habits: {
          key: 'habits', label: 'Habits', role: 'primary',
          fields: [
            { key: 'habit',     label: 'Habit',     type: 'select', required: true,
              config: { options: ['Exercise', 'Meditate', 'Read', 'Journal', 'Cold shower', 'No sugar', 'Walk 10k steps'] } },
            { key: 'completed', label: 'Completed', type: 'boolean', required: true,  config: {} },
            { key: 'notes',     label: 'Notes',     type: 'text',    required: false, config: {} },
            { key: 'logged_at', label: 'Date',      type: 'date',    required: false, config: {} },
          ],
        },
      },
      computed_properties: [
        { key: 'habits_today',  label: 'Done Today',   type: 'count', window: 'today',    format: 'number', precision: 0 },
        { key: 'habits_week',   label: 'Done This Week', type: 'count', window: 'last_7d', format: 'number', precision: 0 },
        { key: 'streak',        label: 'Day Streak',   type: 'streak', format: 'number', precision: 0, unit: 'days' },
      ],
      aly_config: {
        intent_keywords: ['habit', 'habits', 'streak', 'routine', 'done', 'completed', 'checked off'],
        context_hint:    'This module tracks daily habit completion. The user logs whether they completed each habit.',
        log_prompt:      'completed meditation and reading today',
        proactive_insights: [],
      } as any,
    },
  },

  // ── Sleep Log ────────────────────────────────────────────────────────────────
  {
    id:          'sleep_log',
    label:       'Sleep Log',
    description: 'Track sleep hours and quality, spot patterns over time.',
    icon:        '😴',
    brand_color: '#818cf8',
    definition: {
      schemas: {
        sleep: {
          key: 'sleep', label: 'Sleep', role: 'primary',
          fields: [
            { key: 'hours',     label: 'Hours Slept', type: 'number', required: true,
              config: { unit: 'hrs', min: 0, max: 24, step: 0.5 } },
            { key: 'quality',   label: 'Quality',     type: 'select', required: false,
              config: { options: ['Terrible', 'Poor', 'Okay', 'Good', 'Great'] } },
            { key: 'bedtime',   label: 'Bedtime',     type: 'text',   required: false, config: { placeholder: 'e.g. 11:30pm' } },
            { key: 'notes',     label: 'Notes',       type: 'text',   required: false, config: {} },
            { key: 'date',      label: 'Date',        type: 'date',   required: false, config: {} },
          ],
        },
      },
      computed_properties: [
        { key: 'avg_hours',    label: 'Avg Hours',     type: 'avg',  source_field: 'hours', window: 'last_7d', unit: 'hrs', format: 'decimal', precision: 1 },
        { key: 'total_hours',  label: 'Hours This Week', type: 'sum', source_field: 'hours', window: 'last_7d', unit: 'hrs', format: 'decimal', precision: 1 },
      ],
      aly_config: {
        intent_keywords: ['sleep', 'slept', 'woke', 'hours', 'bedtime', 'tired', 'rest', 'nap'],
        context_hint:    'This module tracks nightly sleep duration and quality.',
        log_prompt:      'slept 7.5 hours, quality was good',
        proactive_insights: [],
      } as any,
    },
  },

  // ── Workout Log ──────────────────────────────────────────────────────────────
  {
    id:          'workout_log',
    label:       'Workout Log',
    description: 'Record exercises, sets, reps, and weights per session.',
    icon:        '💪',
    brand_color: '#ef4444',
    definition: {
      schemas: {
        workouts: {
          key: 'workouts', label: 'Workouts', role: 'primary',
          fields: [
            { key: 'exercise',  label: 'Exercise',   type: 'text',   required: true,  config: { placeholder: 'e.g. Bench Press' } },
            { key: 'sets',      label: 'Sets',       type: 'number', required: false, config: { min: 0 } },
            { key: 'reps',      label: 'Reps',       type: 'number', required: false, config: { min: 0 } },
            { key: 'weight_kg', label: 'Weight',     type: 'number', required: false, config: { unit: 'kg', min: 0 } },
            { key: 'notes',     label: 'Notes',      type: 'text',   required: false, config: {} },
            { key: 'date',      label: 'Date',       type: 'date',   required: false, config: {} },
          ],
        },
      },
      computed_properties: [
        { key: 'sets_today',   label: 'Sets Today',    type: 'sum',   source_field: 'sets',      window: 'today',    format: 'number', precision: 0 },
        { key: 'workouts_week', label: 'Sessions/Week', type: 'count',                            window: 'last_7d',  format: 'number', precision: 0 },
        { key: 'streak',       label: 'Day Streak',    type: 'streak',                            format: 'number', precision: 0, unit: 'days' },
      ],
      aly_config: {
        intent_keywords: ['workout', 'exercise', 'gym', 'lift', 'sets', 'reps', 'bench', 'squat', 'deadlift', 'run', 'trained'],
        context_hint:    'This module logs exercise sessions including exercise name, sets, reps, and weights.',
        log_prompt:      'did 4 sets of 8 reps bench press at 80kg',
        proactive_insights: [],
      } as any,
    },
  },

  // ── Water Tracker ────────────────────────────────────────────────────────────
  {
    id:          'water_tracker',
    label:       'Water Tracker',
    description: 'Count glasses of water per day, stay on top of hydration.',
    icon:        '💧',
    brand_color: '#06b6d4',
    definition: {
      schemas: {
        water: {
          key: 'water', label: 'Water', role: 'primary',
          fields: [
            { key: 'glasses',   label: 'Glasses',    type: 'counter', required: true,
              config: { unit: 'glasses', min: 1, max: 20, step: 1, goal: 8 } },
            { key: 'ml',        label: 'Amount (ml)', type: 'number', required: false, config: { unit: 'ml', min: 0 } },
            { key: 'logged_at', label: 'Time',        type: 'datetime', required: false, config: {} },
          ],
        },
      },
      computed_properties: [
        { key: 'glasses_today', label: 'Glasses Today', type: 'sum', source_field: 'glasses', window: 'today', format: 'number', precision: 0, goal_value: 8 },
        { key: 'ml_today',      label: 'ml Today',      type: 'sum', source_field: 'ml',      window: 'today', unit: 'ml', format: 'number', precision: 0 },
      ],
      aly_config: {
        intent_keywords: ['water', 'drink', 'drank', 'hydration', 'glass', 'glasses', 'ml'],
        context_hint:    'This module tracks daily water intake in glasses. Goal is 8 glasses per day.',
        log_prompt:      'drank 2 glasses of water',
        proactive_insights: [],
      } as any,
    },
  },

  // ── Mood Journal ─────────────────────────────────────────────────────────────
  {
    id:          'mood_journal',
    label:       'Mood Journal',
    description: 'Log mood and energy levels, reflect on patterns.',
    icon:        '🌤',
    brand_color: '#ec4899',
    definition: {
      schemas: {
        moods: {
          key: 'moods', label: 'Moods', role: 'primary',
          fields: [
            { key: 'mood',      label: 'Mood',      type: 'select', required: true,
              config: { options: ['😞 Low', '😐 Neutral', '🙂 Good', '😊 Great', '🤩 Amazing'] } },
            { key: 'energy',    label: 'Energy',    type: 'select', required: false,
              config: { options: ['Drained', 'Tired', 'Okay', 'Energised', 'Pumped'] } },
            { key: 'notes',     label: 'Notes',     type: 'text',   required: false, config: { placeholder: 'What influenced your mood?' } },
            { key: 'logged_at', label: 'Time',      type: 'datetime', required: false, config: {} },
          ],
        },
      },
      computed_properties: [
        { key: 'entries_today', label: 'Check-ins Today', type: 'count', window: 'today',    format: 'number', precision: 0 },
        { key: 'entries_week',  label: 'Check-ins / Week', type: 'count', window: 'last_7d', format: 'number', precision: 0 },
      ],
      aly_config: {
        intent_keywords: ['mood', 'feeling', 'feel', 'energy', 'emotions', 'anxious', 'happy', 'sad', 'stressed', 'vibes'],
        context_hint:    'This module tracks daily mood and energy levels for reflection and pattern spotting.',
        log_prompt:      'feeling great today, energy is high',
        proactive_insights: [],
      } as any,
    },
  },
];
