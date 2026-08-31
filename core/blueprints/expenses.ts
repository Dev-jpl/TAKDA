// ─── Expenses — hand-written Blueprint ───────────────────────────────────────
// The first concrete Blueprint, written by hand before any tooling exists.
// Its job is to answer a question no amount of type design can: is the schema
// in ../blueprint.ts actually sufficient, and does it actually stay above
// pixel altitude when something real is expressed in it?
//
// Ticket WG-TX-AJHJ94-00001-TK. Deliberately the simplest useful money tool:
// log what you spent, see it back, know the month's total.
//
// Note every id below is a literal. They were minted once and are now part of
// the document. Rename `category` to `bucket` and every id stays put — that is
// the property ticket 00002 exists to prove.

import type { Blueprint } from "../blueprint";
import {
  asFieldId,
  asModuleId,
  asQuestionId,
  asRecordId,
  asViewId,
} from "../ids";

// Pulled out so the references below read as names rather than noise.
const EXPENSE = asRecordId("rec_0mtgn3o0cnzrlz6yi");

const AMOUNT = asFieldId("fld_0mtgn3o0dx1tqp80b");
const SPENT_ON = asFieldId("fld_0mtgn3o0d4y6q4yn4");
const CATEGORY = asFieldId("fld_0mtgn3o0dx12uc5nn");
const NOTE = asFieldId("fld_0mtgn3o0djx0dxf9f");

const LOG_EXPENSE = asViewId("viw_0mtgn3o0dzuxpbges");
const RECENT = asViewId("viw_0mtgn3o0dn5tssqr6");
const THIS_MONTH = asViewId("viw_0mtgn3o0du3su4rlb");

const SPENT_THIS_MONTH = asQuestionId("qst_0mtgn3o0ew2dsb8eu");
const COUNT_THIS_MONTH = asQuestionId("qst_0mtgn3o0gpijvdnkd");

export const EXPENSES: Blueprint = {
  id: asModuleId("mod_0mtgn3o098jpbwcjy"),
  key: "expenses",
  name: "Expenses",
  purpose: "Keep track of what I spend, so I know where the month went.",
  scope: {
    includes: ["Recording money going out", "Totalling a period"],
    excludes: [
      "Income and net position — those are their own Modules",
      "Budgets and forecasting — not yet asked for",
      "Anything resembling double-entry accounting",
    ],
  },
  version: 1,
  currency: "PHP",

  records: [
    {
      id: EXPENSE,
      key: "expense",
      name: "Expense",
      plural: "Expenses",
      describes: "One thing I spent money on.",
      fields: [
        {
          id: AMOUNT,
          key: "amount",
          label: "Amount",
          type: "money",
          required: true,
        },
        {
          id: SPENT_ON,
          key: "spent_on",
          label: "Date",
          type: "date",
          required: true,
          defaultsToToday: true,
          from: "generated",
          because:
            "Almost every expense is logged the day it happens, so asking is friction. Still editable.",
        },
        {
          id: CATEGORY,
          key: "category",
          label: "Category",
          type: "select",
          openEnded: true,
          from: "inferred",
          because:
            'Answering "where did the month go" needs a grouping. Open-ended so the list grows with real spending instead of being guessed up front.',
          options: [
            { value: "food", label: "Food" },
            { value: "transport", label: "Transport" },
            { value: "bills", label: "Bills" },
            { value: "health", label: "Health" },
            { value: "other", label: "Other" },
          ],
        },
        {
          id: NOTE,
          key: "note",
          label: "Note",
          type: "text",
          from: "optional",
          because: "Somewhere to put the detail the category loses.",
        },
      ],
    },
  ],

  // Reporting is stated before the views, because the questions are what
  // justify the fields. `amount` and `spent_on` are required precisely because
  // these two questions cannot be answered without them.
  questions: [
    {
      id: SPENT_THIS_MONTH,
      key: "spent_this_month",
      ask: "How much have I spent this month?",
      on: EXPENSE,
      aggregate: "sum",
      field: AMOUNT,
      over: SPENT_ON,
      period: "this_month",
    },
    {
      id: COUNT_THIS_MONTH,
      key: "count_this_month",
      ask: "How many things did I buy this month?",
      on: EXPENSE,
      aggregate: "count",
      over: SPENT_ON,
      period: "this_month",
      from: "generated",
      because:
        "A total alone hides whether it was one big purchase or forty small ones.",
    },
  ],

  views: [
    {
      id: LOG_EXPENSE,
      key: "log_expense",
      name: "Log expense",
      intent: "capture",
      on: EXPENSE,
      fields: [AMOUNT, SPENT_ON, CATEGORY, NOTE],
      submitLabel: "Save expense",
    },
    {
      id: THIS_MONTH,
      key: "this_month",
      name: "This month",
      intent: "summarise",
      on: EXPENSE,
      answers: [SPENT_THIS_MONTH, COUNT_THIS_MONTH],
    },
    {
      id: RECENT,
      key: "recent",
      name: "Recent expenses",
      intent: "browse",
      on: EXPENSE,
      row: { primary: CATEGORY, secondary: NOTE, trailing: AMOUNT },
      sort: { field: SPENT_ON, direction: "desc" },
      limit: 20,
    },
  ],

  home: [THIS_MONTH, LOG_EXPENSE, RECENT],
};
