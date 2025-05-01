import pytest
from datetime import datetime
from backend.app.utils.slots import build_slots


def test_build_slots_default_granularity():
    """Test slot generation with default 30-min granularity."""
    slots = build_slots("09:00", "12:00")
    
    # Should have 6 slots from 9:00 to 11:30 (inclusive) in 30-min increments
    assert len(slots) == 6
    
    # Check all slots exist and are marked "free"
    expected_slots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]
    for slot in expected_slots:
        assert slot in slots
        assert slots[slot] == "free"


def test_build_slots_custom_granularity():
    """Test slot generation with custom granularity (60 min)."""
    slots = build_slots("09:00", "12:00", granularity_min=60)
    
    # Should have 3 slots from 9:00 to 11:00 (inclusive) in 60-min increments
    assert len(slots) == 3
    
    # Check all slots exist and are marked "free"
    expected_slots = ["09:00", "10:00", "11:00"]
    for slot in expected_slots:
        assert slot in slots
        assert slots[slot] == "free"


def test_build_slots_uneven_end_time():
    """Test slot generation with uneven end time (not a multiple of granularity)."""
    slots = build_slots("09:00", "10:45")
    
    # Should have 3 slots from 9:00 to 10:30 (inclusive) in 30-min increments
    assert len(slots) == 3
    
    # Check all slots exist and are marked "free"
    expected_slots = ["09:00", "09:30", "10:00", "10:30"]
    for slot in expected_slots:
        assert slot in slots
        assert slots[slot] == "free"


def test_build_slots_exact_boundary():
    """Test slot generation when end time is exactly at a slot boundary."""
    slots = build_slots("09:00", "10:30")
    
    # Should have 3 slots from 9:00 to 10:00 (inclusive) in 30-min increments
    assert len(slots) == 3
    
    # Check all slots exist and are marked "free"
    expected_slots = ["09:00", "09:30", "10:00"]
    for slot in expected_slots:
        assert slot in slots
        assert slots[slot] == "free"


def test_build_slots_invalid_format():
    """Test slot generation with invalid time format."""
    with pytest.raises(ValueError):
        build_slots("9:00", "12:00")  # Missing leading zero
    
    with pytest.raises(ValueError):
        build_slots("09:00", "24:00")  # Invalid hour


def test_build_slots_end_before_start():
    """Test slot generation when end time is before or equal to start time."""
    with pytest.raises(ValueError):
        build_slots("12:00", "09:00")  # End before start
    
    with pytest.raises(ValueError):
        build_slots("09:00", "09:00")  # End equal to start 