from datetime import datetime, timedelta
from typing import Dict

__all__ = ["build_slots"]


def build_slots(start_time: str, end_time: str, granularity_min: int = 15) -> Dict[str, str]:
    """Generate a Firestore `slots` map for one day.

    Args:
        start_time: HH:MM string (24-hour) inclusive start of working hours.
        end_time:   HH:MM string (24-hour) exclusive end of working hours.
        granularity_min: slot length in minutes (default 15).

    Returns:
        Dict mapping "HH:MM" → "free" for each slot in the interval.

    Raises:
        ValueError: if input formats are invalid or end <= start.
    """

    try:
        start_dt = datetime.strptime(start_time, "%H:%M")
        end_dt = datetime.strptime(end_time, "%H:%M")
    except ValueError as err:
        raise ValueError("start_time and end_time must be HH:MM 24-hour strings") from err

    if end_dt <= start_dt:
        raise ValueError("end_time must be after start_time")

    slots: Dict[str, str] = {}
    current = start_dt
    while current < end_dt:
        key = current.strftime("%H:%M")
        slots[key] = "free"
        current += timedelta(minutes=granularity_min)

    return slots 