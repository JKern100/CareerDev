"""Tests for the deterministic scoring engine."""

from app.services.scoring import load_pathways, score_pathways


def test_load_pathways_returns_list():
    pathways = load_pathways()
    assert isinstance(pathways, list)
    assert len(pathways) > 0


def test_load_pathways_has_required_fields():
    pathways = load_pathways()
    for p in pathways:
        assert "id" in p
        assert "name" in p


def test_score_pathways_empty_answers():
    """Scoring with no answers should still return results (with low scores)."""
    results = score_pathways({})
    assert isinstance(results, list)
    assert len(results) > 0


def test_score_pathways_returns_sorted():
    """Results should be sorted by adjusted_score descending."""
    results = score_pathways({})
    scores = [r.adjusted_score for r in results]
    assert scores == sorted(scores, reverse=True)
