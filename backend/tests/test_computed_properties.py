"""
Tests for compute / insight helpers.
Import directly from helpers.py — zero external dependencies.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from datetime import datetime, timezone, timedelta
from services.agent_graph.helpers import (
    window_filter,
    eval_computed_prop,
    fmt_cv,
    check_insight_condition,
)


def make_entries(n, hours_step=2, cal_base=300):
    now = datetime.now(timezone.utc)
    return [
        {
            "id": f"e{i}",
            "data": {"calories": cal_base + i * 50, "food_name": f"Food {i}"},
            "created_at": (now - timedelta(hours=i * hours_step)).isoformat(),
        }
        for i in range(n)
    ]


# ── window_filter ─────────────────────────────────────────────────────────────

class TestWindowFilter:
    def test_all_returns_all(self):          assert len(window_filter(make_entries(5), "all")) == 5
    def test_none_returns_all(self):         assert len(window_filter(make_entries(5), None)) == 5
    def test_today_keeps_recent(self):       assert len(window_filter(make_entries(5, 2), "today")) >= 1

    def test_last_7d_excludes_old(self):
        now  = datetime.now(timezone.utc)
        old  = {"id": "old",  "data": {}, "created_at": (now - timedelta(days=10)).isoformat()}
        new  = {"id": "new",  "data": {}, "created_at": now.isoformat()}
        ids  = [e["id"] for e in window_filter([old, new], "last_7d")]
        assert "new" in ids and "old" not in ids

    def test_month_keeps_current(self):
        now  = datetime.now(timezone.utc)
        curr = {"id": "c", "data": {}, "created_at": now.isoformat()}
        old  = {"id": "o", "data": {}, "created_at": (now - timedelta(days=35)).isoformat()}
        ids  = [e["id"] for e in window_filter([curr, old], "month")]
        assert "c" in ids and "o" not in ids


# ── eval_computed_prop ────────────────────────────────────────────────────────

class TestEvalComputedProp:
    def test_sum(self):
        e = make_entries(4)
        assert eval_computed_prop({"type":"sum","source_field":"calories","window":"all"}, e) \
               == sum(x["data"]["calories"] for x in e)

    def test_count(self):
        assert eval_computed_prop({"type":"count","window":"all"}, make_entries(4)) == 4

    def test_avg(self):
        e = make_entries(4)
        vals = [x["data"]["calories"] for x in e]
        result = eval_computed_prop({"type":"avg","source_field":"calories","window":"all"}, e)
        assert abs(result - sum(vals)/len(vals)) < 0.01

    def test_min(self):
        e = make_entries(4)
        assert eval_computed_prop({"type":"min","source_field":"calories","window":"all"}, e) \
               == min(x["data"]["calories"] for x in e)

    def test_max(self):
        e = make_entries(4)
        assert eval_computed_prop({"type":"max","source_field":"calories","window":"all"}, e) \
               == max(x["data"]["calories"] for x in e)

    def test_sum_empty_is_zero(self):
        assert eval_computed_prop({"type":"sum","source_field":"calories","window":"all"}, []) == 0

    def test_avg_empty_is_none(self):
        assert eval_computed_prop({"type":"avg","source_field":"calories","window":"all"}, []) is None

    def test_unknown_type_none(self):
        assert eval_computed_prop({"type":"flux","source_field":"calories","window":"all"}, make_entries(2)) is None

    def test_windowed_sum_excludes_old(self):
        now = datetime.now(timezone.utc)
        t   = {"id":"t","data":{"calories":500},"created_at": now.isoformat()}
        old = {"id":"o","data":{"calories":999},"created_at":(now-timedelta(days=10)).isoformat()}
        result = eval_computed_prop({"type":"sum","source_field":"calories","window":"today"}, [t, old])
        assert result == 500


# ── fmt_cv ────────────────────────────────────────────────────────────────────

class TestFmtCv:
    def test_integer_with_unit(self):    assert fmt_cv(1350, {"unit":"kcal"}) == "1350 kcal"
    def test_integer_no_unit(self):      assert fmt_cv(1350, {"unit":""})     == "1350"
    def test_percent(self):              assert fmt_cv(72,   {"format":"percent"}) == "72%"
    def test_decimal(self):              assert fmt_cv(7.5,  {"format":"decimal","precision":1,"unit":"hrs"}) == "7.5 hrs"
    def test_none_returns_none(self):    assert fmt_cv(None, {}) is None
    def test_float_truncates(self):      assert "7.3" in fmt_cv(7.333, {"unit":""})


# ── check_insight_condition ───────────────────────────────────────────────────

class TestCheckInsightCondition:
    low  = {"Calories Today": "1350 kcal"}
    high = {"Calories Today": "2100 kcal"}

    def test_exceeds_not_met(self):   assert check_insight_condition("when calories today exceeds 2000", self.low)  is False
    def test_exceeds_met(self):       assert check_insight_condition("when calories today exceeds 2000", self.high) is True
    def test_gt_met(self):            assert check_insight_condition("calories today > 2000", self.high) is True
    def test_gt_not_met(self):        assert check_insight_condition("calories today > 2000", self.low)  is False
    def test_lt_met(self):            assert check_insight_condition("day streak < 3", {"Day Streak":"1 days"}) is True
    def test_lt_not_met(self):        assert check_insight_condition("day streak < 3", {"Day Streak":"5 days"}) is False
    def test_gte_boundary(self):      assert check_insight_condition("calories today >= 2000", {"Calories Today":"2000 kcal"}) is True
    def test_empty_fail_open(self):   assert check_insight_condition("", self.high) is True
    def test_unparseable_fail_open(self): assert check_insight_condition("when goal is exceeded", self.high) is True
    def test_no_values_fail_open(self):   assert check_insight_condition("calories > 2000", {}) is True
