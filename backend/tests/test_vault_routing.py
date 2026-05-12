"""Tests for vault module routing — pure helper, no external dependencies."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from services.agent_graph.helpers import detect_module_slug


class TestDetectModuleSlug:
    def test_explicit_wins(self):       assert detect_module_slug("ate calories", "expense_tracker") == "expense_tracker"
    def test_explicit_track_detects(self): assert detect_module_slug("ate 500 calories", "track") == "calorie_counter"
    def test_calorie_keyword(self):     assert detect_module_slug("log 500 calories", "track") == "calorie_counter"
    def test_food_keyword(self):        assert detect_module_slug("had food today", "track") == "calorie_counter"
    def test_meal_keyword(self):        assert detect_module_slug("meal: chicken", "track") == "calorie_counter"
    def test_kcal_keyword(self):        assert detect_module_slug("300 kcal shake", "track") == "calorie_counter"
    def test_ate_keyword(self):         assert detect_module_slug("ate pizza", "track") == "calorie_counter"
    def test_spent_keyword(self):       assert detect_module_slug("spent 150 on groceries", "track") == "expense_tracker"
    def test_bought_keyword(self):      assert detect_module_slug("bought coffee for 60", "track") == "expense_tracker"
    def test_paid_keyword(self):        assert detect_module_slug("paid the electric bill", "track") == "expense_tracker"
    def test_peso_symbol(self):         assert detect_module_slug("₱250 for transport", "track") == "expense_tracker"
    def test_neutral_is_task(self):     assert detect_module_slug("review the PR", "track") == "track"
    def test_empty_is_task(self):       assert detect_module_slug("", "track") == "track"
    def test_uppercase_calorie(self):   assert detect_module_slug("CALORIES 400", "track") == "calorie_counter"
