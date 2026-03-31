"""Tests for the questionnaire routing engine."""

from app.services.routing import (
    get_question_bank,
    get_questions_for_module,
    is_tier1_complete,
    is_tier2_complete,
    TIER1_IDS,
    TIER2_IDS,
)


def test_question_bank_loads():
    bank = get_question_bank()
    assert isinstance(bank, list)
    assert len(bank) > 0


def test_question_bank_has_required_fields():
    bank = get_question_bank()
    for q in bank:
        assert q.question_id
        assert q.module


def test_tier1_incomplete_with_no_answers():
    assert is_tier1_complete(set()) is False


def test_tier1_complete_with_all_ids():
    assert is_tier1_complete(TIER1_IDS) is True


def test_tier2_incomplete_with_no_answers():
    assert is_tier2_complete(set()) is False


def test_tier2_complete_with_all_ids():
    assert is_tier2_complete(TIER1_IDS | TIER2_IDS) is True


def test_get_questions_for_module():
    questions = get_questions_for_module("A")
    assert all(q.module == "A" for q in questions)
