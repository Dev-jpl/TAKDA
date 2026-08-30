import type { Module } from "@/lib/module-runtime/types";

const MEALS_C = "col_meals";
const F_MEAL = "f_meal";
const F_MEAL_TYPE = "f_meal_type";
const F_CAL = "f_calories";
const F_PROTEIN = "f_protein";
const F_CARBS = "f_carbs";
const F_FAT = "f_fat";

const TARGETS_C = "col_targets";
const F_DAILY_GOAL = "f_daily_calorie_goal";
const F_PROTEIN_GOAL = "f_daily_protein_goal";
const F_CARBS_GOAL = "f_daily_carbs_goal";
const F_FAT_GOAL = "f_daily_fat_goal";
// Body metrics — used by the auto-calculator.
const F_WEIGHT = "f_weight_kg";
const F_HEIGHT = "f_height_cm";
const F_AGE = "f_age";
const F_SEX = "f_sex";
const F_ACTIVITY = "f_activity";
const F_MODE = "f_mode";

export const CALORIE_TRACKER: Module = {
  id: "calorie-tracker@1",
  name: "Calorie tracker",
  slug: "calorie-tracker",
  defaultScreenKey: "today",
  collections: [
    {
      id: MEALS_C,
      key: "meals",
      name: "Meals",
      fields: [
        {
          id: F_MEAL_TYPE,
          key: "meal_type",
          label: "Meal type",
          type: "select",
          options: [
            { value: "breakfast", label: "Breakfast" },
            { value: "lunch", label: "Lunch" },
            { value: "dinner", label: "Dinner" },
            { value: "snack", label: "Snack" },
          ],
        },
        { id: F_MEAL, key: "meal", label: "Meal", type: "text", required: true },
        { id: F_CAL, key: "calories", label: "Calories", type: "number", unit: "kcal", required: true },
        { id: F_PROTEIN, key: "protein", label: "Protein", type: "number", unit: "g" },
        { id: F_CARBS, key: "carbs", label: "Carbs", type: "number", unit: "g" },
        { id: F_FAT, key: "fat", label: "Fat", type: "number", unit: "g" },
      ],
    },
    {
      id: TARGETS_C,
      key: "targets",
      name: "Targets",
      singleton: true,
      fields: [
        { id: F_DAILY_GOAL, key: "daily_calorie_goal", label: "Daily calorie goal", type: "number", unit: "kcal" },
        { id: F_PROTEIN_GOAL, key: "daily_protein_goal", label: "Daily protein goal", type: "number", unit: "g" },
        { id: F_CARBS_GOAL, key: "daily_carbs_goal", label: "Daily carbs goal", type: "number", unit: "g" },
        { id: F_FAT_GOAL, key: "daily_fat_goal", label: "Daily fat goal", type: "number", unit: "g" },
        // Body + intent — feed the auto calculator.
        { id: F_WEIGHT, key: "weight_kg", label: "Weight", type: "number", unit: "kg" },
        { id: F_HEIGHT, key: "height_cm", label: "Height", type: "number", unit: "cm" },
        { id: F_AGE, key: "age", label: "Age", type: "number", unit: "yr" },
        {
          id: F_SEX,
          key: "sex",
          label: "Sex",
          type: "select",
          options: [
            { value: "female", label: "Female" },
            { value: "male", label: "Male" },
          ],
        },
        {
          id: F_ACTIVITY,
          key: "activity",
          label: "Activity",
          type: "select",
          options: [
            { value: "sedentary", label: "Sedentary" },
            { value: "light", label: "Light" },
            { value: "moderate", label: "Moderate" },
            { value: "active", label: "Active" },
            { value: "very_active", label: "Very active" },
          ],
        },
        {
          id: F_MODE,
          key: "mode",
          label: "Mode",
          type: "select",
          options: [
            { value: "deficit", label: "Deficit" },
            { value: "maintenance", label: "Maintenance" },
            { value: "surplus", label: "Surplus" },
          ],
        },
      ],
    },
  ],
  screens: [
    // ── Main page ────────────────────────────────────────────────────────
    {
      id: "scr_today",
      key: "today",
      name: "Today",
      kind: "page",
      root: {
        kind: "container",
        id: "today_root",
        direction: "column",
        gap: 20,
        padding: 0,
        children: [
          {
            kind: "element",
            id: "today_cal_stat",
            type: "stat",
            binding: { kind: "field", collectionId: MEALS_C, fieldId: F_CAL },
            config: { aggregation: "sum", window: "today", label: "Daily calories", unit: "kcal" },
          },
          {
            kind: "element",
            id: "today_cal_progress",
            type: "progress_bar",
            binding: { kind: "field", collectionId: MEALS_C, fieldId: F_CAL },
            config: {
              aggregation: "sum",
              window: "today",
              goalCollectionId: TARGETS_C,
              goalFieldId: F_DAILY_GOAL,
              label: "Toward daily goal",
              unit: "kcal",
            },
          },
          // Macros row — each tile is its own column: stat + compact bar.
          {
            kind: "container",
            id: "macros_row",
            direction: "row",
            gap: 12,
            padding: 0,
            children: [
              {
                kind: "container",
                id: "macro_protein_col",
                direction: "column",
                gap: 8,
                card: true,
                children: [
                  {
                    kind: "element",
                    id: "macro_protein_stat",
                    type: "stat",
                    binding: { kind: "field", collectionId: MEALS_C, fieldId: F_PROTEIN },
                    config: { aggregation: "sum", window: "today", label: "Protein", unit: "g", size: "sm" },
                  },
                  {
                    kind: "element",
                    id: "macro_protein_bar",
                    type: "progress_bar",
                    binding: { kind: "field", collectionId: MEALS_C, fieldId: F_PROTEIN },
                    config: {
                      size: "sm",
                      aggregation: "sum",
                      window: "today",
                      goalCollectionId: TARGETS_C,
                      goalFieldId: F_PROTEIN_GOAL,
                    },
                  },
                ],
              },
              {
                kind: "container",
                id: "macro_carbs_col",
                direction: "column",
                gap: 8,
                card: true,
                children: [
                  {
                    kind: "element",
                    id: "macro_carbs_stat",
                    type: "stat",
                    binding: { kind: "field", collectionId: MEALS_C, fieldId: F_CARBS },
                    config: { aggregation: "sum", window: "today", label: "Carbs", unit: "g", size: "sm" },
                  },
                  {
                    kind: "element",
                    id: "macro_carbs_bar",
                    type: "progress_bar",
                    binding: { kind: "field", collectionId: MEALS_C, fieldId: F_CARBS },
                    config: {
                      size: "sm",
                      aggregation: "sum",
                      window: "today",
                      goalCollectionId: TARGETS_C,
                      goalFieldId: F_CARBS_GOAL,
                    },
                  },
                ],
              },
              {
                kind: "container",
                id: "macro_fat_col",
                direction: "column",
                gap: 8,
                card: true,
                children: [
                  {
                    kind: "element",
                    id: "macro_fat_stat",
                    type: "stat",
                    binding: { kind: "field", collectionId: MEALS_C, fieldId: F_FAT },
                    config: { aggregation: "sum", window: "today", label: "Fat", unit: "g", size: "sm" },
                  },
                  {
                    kind: "element",
                    id: "macro_fat_bar",
                    type: "progress_bar",
                    binding: { kind: "field", collectionId: MEALS_C, fieldId: F_FAT },
                    config: {
                      size: "sm",
                      aggregation: "sum",
                      window: "today",
                      goalCollectionId: TARGETS_C,
                      goalFieldId: F_FAT_GOAL,
                    },
                  },
                ],
              },
            ],
          },

          { kind: "element", id: "today_div", type: "divider" },
          {
            kind: "element",
            id: "today_meals_h",
            type: "heading",
            config: { text: "Today's meals", size: "md" },
          },
          {
            kind: "element",
            id: "today_meals_list",
            type: "list",
            binding: { kind: "collection", collectionId: MEALS_C },
            config: {
              titleFieldId: F_MEAL,
              subtitleFieldId: F_CAL,
              unit: "kcal",
              window: "today",
              emptyText: "Tap + to log your first meal.",
            },
          },
        ],
      },
    },

    // ── Log meal modal ───────────────────────────────────────────────────
    {
      id: "scr_log",
      key: "log",
      name: "Log a meal",
      kind: "modal",
      root: {
        kind: "container",
        id: "log_root",
        direction: "column",
        gap: 14,
        padding: 0,
        children: [
          {
            kind: "element",
            id: "log_meal",
            type: "text_input",
            binding: { kind: "field", collectionId: MEALS_C, fieldId: F_MEAL },
            config: { placeholder: "What did you eat?" },
          },
          {
            kind: "element",
            id: "log_cal",
            type: "number_input",
            binding: { kind: "field", collectionId: MEALS_C, fieldId: F_CAL },
            config: { placeholder: "Calories" },
          },
          {
            kind: "element",
            id: "log_protein",
            type: "number_input",
            binding: { kind: "field", collectionId: MEALS_C, fieldId: F_PROTEIN },
            config: { placeholder: "Protein (g)" },
          },
          {
            kind: "element",
            id: "log_carbs",
            type: "number_input",
            binding: { kind: "field", collectionId: MEALS_C, fieldId: F_CARBS },
            config: { placeholder: "Carbs (g)" },
          },
          {
            kind: "element",
            id: "log_fat",
            type: "number_input",
            binding: { kind: "field", collectionId: MEALS_C, fieldId: F_FAT },
            config: { placeholder: "Fat (g)" },
          },
          { kind: "element", id: "log_sp", type: "spacer", config: { size: 4 } },
          {
            kind: "element",
            id: "log_save",
            type: "button",
            config: { text: "Save meal", action: "save_entry" },
          },
        ],
      },
    },

    // ── Daily goal modal — auto-calculate from body + intent, with a
    //    manual override section beneath for fine-tuning. ─────────────────
    {
      id: "scr_goal",
      key: "goal",
      name: "Daily goal",
      kind: "modal",
      root: {
        kind: "container",
        id: "goal_root",
        direction: "column",
        gap: 14,
        padding: 0,
        children: [
          // ── Auto section ────────────────────────────────────────────────
          {
            kind: "element",
            id: "auto_h",
            type: "heading",
            config: { text: "Calculate from body", size: "md" },
          },
          {
            kind: "element",
            id: "auto_p",
            type: "paragraph",
            config: {
              text:
                "Pick mode + activity, fill in your body metrics, and we'll compute the four daily goals using Mifflin-St Jeor.",
            },
          },
          {
            kind: "element",
            id: "auto_mode",
            type: "select_input",
            binding: { kind: "field", collectionId: TARGETS_C, fieldId: F_MODE },
          },
          {
            kind: "element",
            id: "auto_activity",
            type: "select_input",
            binding: { kind: "field", collectionId: TARGETS_C, fieldId: F_ACTIVITY },
          },
          {
            kind: "element",
            id: "auto_sex",
            type: "select_input",
            binding: { kind: "field", collectionId: TARGETS_C, fieldId: F_SEX },
          },
          {
            kind: "container",
            id: "auto_body_row",
            direction: "row",
            gap: 10,
            padding: 0,
            children: [
              {
                kind: "element",
                id: "auto_weight",
                type: "number_input",
                binding: { kind: "field", collectionId: TARGETS_C, fieldId: F_WEIGHT },
                config: { placeholder: "Weight (kg)" },
              },
              {
                kind: "element",
                id: "auto_height",
                type: "number_input",
                binding: { kind: "field", collectionId: TARGETS_C, fieldId: F_HEIGHT },
                config: { placeholder: "Height (cm)" },
              },
              {
                kind: "element",
                id: "auto_age",
                type: "number_input",
                binding: { kind: "field", collectionId: TARGETS_C, fieldId: F_AGE },
                config: { placeholder: "Age" },
              },
            ],
          },
          // Live preview — updates as the user edits mode/activity/body.
          // Uses the same shared computeCalorieGoals function the button
          // commits, so the preview never disagrees with the save.
          {
            kind: "element",
            id: "auto_preview",
            type: "goal_preview",
            config: {
              targetCollectionId: TARGETS_C,
              weightFieldId: F_WEIGHT,
              heightFieldId: F_HEIGHT,
              ageFieldId: F_AGE,
              sexFieldId: F_SEX,
              activityFieldId: F_ACTIVITY,
              modeFieldId: F_MODE,
            },
          },
          {
            kind: "element",
            id: "auto_run",
            type: "button",
            config: {
              text: "Calculate & save",
              action: "compute_calorie_goals",
              targetCollectionId: TARGETS_C,
              weightFieldId: F_WEIGHT,
              heightFieldId: F_HEIGHT,
              ageFieldId: F_AGE,
              sexFieldId: F_SEX,
              activityFieldId: F_ACTIVITY,
              modeFieldId: F_MODE,
              calorieGoalFieldId: F_DAILY_GOAL,
              proteinGoalFieldId: F_PROTEIN_GOAL,
              carbsGoalFieldId: F_CARBS_GOAL,
              fatGoalFieldId: F_FAT_GOAL,
            },
          },

          { kind: "element", id: "goal_div", type: "divider" },

          // ── Manual override section ─────────────────────────────────────
          {
            kind: "element",
            id: "manual_h",
            type: "heading",
            config: { text: "Or set manually", size: "md" },
          },
          {
            kind: "element",
            id: "goal_cal",
            type: "number_input",
            binding: { kind: "field", collectionId: TARGETS_C, fieldId: F_DAILY_GOAL },
            config: { placeholder: "Calories (kcal)" },
          },
          {
            kind: "element",
            id: "goal_protein",
            type: "number_input",
            binding: { kind: "field", collectionId: TARGETS_C, fieldId: F_PROTEIN_GOAL },
            config: { placeholder: "Protein (g)" },
          },
          {
            kind: "element",
            id: "goal_carbs",
            type: "number_input",
            binding: { kind: "field", collectionId: TARGETS_C, fieldId: F_CARBS_GOAL },
            config: { placeholder: "Carbs (g)" },
          },
          {
            kind: "element",
            id: "goal_fat",
            type: "number_input",
            binding: { kind: "field", collectionId: TARGETS_C, fieldId: F_FAT_GOAL },
            config: { placeholder: "Fat (g)" },
          },
          {
            kind: "element",
            id: "goal_save",
            type: "button",
            config: {
              text: "Save manual goals",
              action: "save_entry",
              variant: "secondary",
            },
          },
        ],
      },
    },
  ],
};
