import pytest
from datetime import date, datetime, timedelta
from unittest.mock import Mock, patch
from backend.app.routers.availability import _generate_availability_for_day, _get_cached_availability
from backend.app.models import Mechanic, MechanicSchedule, DaySchedule, Slot


class TestDynamicAvailability:
    """Test the new dynamic availability generation system."""

    @pytest.fixture
    def mock_db(self):
        """Create a mock Firestore database client."""
        return Mock()

    @pytest.fixture
    def sample_mechanic(self):
        """Create a sample mechanic for testing."""
        schedule = MechanicSchedule(
            monday=DaySchedule(start="08:00", end="17:00"),
            tuesday=DaySchedule(start="08:00", end="17:00"),
            wednesday=DaySchedule(start="08:00", end="17:00"),
            thursday=DaySchedule(start="08:00", end="17:00"),
            friday=DaySchedule(start="08:00", end="17:00"),
            saturday=None,
            sunday=None
        )
        
        return Mechanic(
            id="mechanic_1",
            name="John Doe",
            email="john@example.com",
            specialties=["service_1", "service_2"],
            schedule=schedule,
            active=True
        )

    @pytest.mark.asyncio
    async def test_generate_availability_for_weekday(self, mock_db, sample_mechanic):
        """Test availability generation for a weekday."""
        # Mock the mechanics query
        mock_doc = Mock()
        mock_doc.to_dict.return_value = {
            "name": sample_mechanic.name,
            "email": sample_mechanic.email,
            "specialties": sample_mechanic.specialties,
            "schedule": {
                "monday": {"start": "08:00", "end": "17:00"},
                "tuesday": {"start": "08:00", "end": "17:00"},
                "wednesday": {"start": "08:00", "end": "17:00"},
                "thursday": {"start": "08:00", "end": "17:00"},
                "friday": {"start": "08:00", "end": "17:00"},
                "saturday": None,
                "sunday": None
            },
            "active": True
        }
        mock_doc.id = "mechanic_1"
        
        mock_db.collection.return_value.where.return_value.stream.return_value = [mock_doc]
        
        # Mock empty bookings query
        mock_db.collection.return_value.where.return_value.where.return_value.where.return_value.stream.return_value = []
        
        # Test for a Monday
        test_date = date(2025, 6, 16)  # A Monday
        
        slots = await _generate_availability_for_day(mock_db, test_date)
        
        # Should generate slots from 08:00 to 17:00 with 30-minute intervals
        assert len(slots) > 0
        assert all(slot.is_free for slot in slots)
        assert all(slot.mechanic_id == "mechanic_1" for slot in slots)
        
        # Check that slots are properly formatted
        first_slot = slots[0]
        assert first_slot.start.endswith("T08:00:00")
        assert first_slot.end.endswith("T08:00:00")

    @pytest.mark.asyncio
    async def test_generate_availability_with_service_filter(self, mock_db, sample_mechanic):
        """Test availability generation with service filtering."""
        # Mock the mechanics query with service filter
        mock_doc = Mock()
        mock_doc.to_dict.return_value = {
            "name": sample_mechanic.name,
            "email": sample_mechanic.email,
            "specialties": sample_mechanic.specialties,
            "schedule": {
                "monday": {"start": "08:00", "end": "17:00"},
                "tuesday": {"start": "08:00", "end": "17:00"},
                "wednesday": {"start": "08:00", "end": "17:00"},
                "thursday": {"start": "08:00", "end": "17:00"},
                "friday": {"start": "08:00", "end": "17:00"},
                "saturday": None,
                "sunday": None
            },
            "active": True
        }
        mock_doc.id = "mechanic_1"
        
        # Mock the query chain for service filtering
        mock_collection = Mock()
        mock_where_active = Mock()
        mock_where_service = Mock()
        
        mock_db.collection.return_value = mock_collection
        mock_collection.where.return_value = mock_where_active
        mock_where_active.where.return_value = mock_where_service
        mock_where_service.stream.return_value = [mock_doc]
        
        # Mock empty bookings query
        mock_bookings_collection = Mock()
        mock_bookings_where1 = Mock()
        mock_bookings_where2 = Mock()
        mock_bookings_where3 = Mock()
        
        # Set up the booking query chain
        def collection_side_effect(name):
            if name == "mechanics":
                return mock_collection
            elif name == "bookings":
                return mock_bookings_collection
            
        mock_db.collection.side_effect = collection_side_effect
        mock_bookings_collection.where.return_value = mock_bookings_where1
        mock_bookings_where1.where.return_value = mock_bookings_where2
        mock_bookings_where2.where.return_value = mock_bookings_where3
        mock_bookings_where3.stream.return_value = []
        
        # Test for a Monday with service filter
        test_date = date(2025, 6, 16)  # A Monday
        service_id = "service_1"
        
        slots = await _generate_availability_for_day(mock_db, test_date, service_id)
        
        # Should generate slots for the mechanic who can perform this service
        assert len(slots) > 0
        assert all(slot.is_free for slot in slots)
        assert all(slot.mechanic_id == "mechanic_1" for slot in slots)
        
        # Verify the service filter was applied
        mock_where_active.where.assert_called_with("specialties", "array-contains", service_id)

    @pytest.mark.asyncio
    async def test_generate_availability_for_weekend(self, mock_db, sample_mechanic):
        """Test availability generation for a weekend day (should be empty)."""
        # Mock the mechanics query
        mock_doc = Mock()
        mock_doc.to_dict.return_value = {
            "name": sample_mechanic.name,
            "email": sample_mechanic.email,
            "specialties": sample_mechanic.specialties,
            "schedule": {
                "monday": {"start": "08:00", "end": "17:00"},
                "tuesday": {"start": "08:00", "end": "17:00"},
                "wednesday": {"start": "08:00", "end": "17:00"},
                "thursday": {"start": "08:00", "end": "17:00"},
                "friday": {"start": "08:00", "end": "17:00"},
                "saturday": None,
                "sunday": None
            },
            "active": True
        }
        mock_doc.id = "mechanic_1"
        
        mock_db.collection.return_value.where.return_value.stream.return_value = [mock_doc]
        
        # Test for a Saturday
        test_date = date(2025, 6, 21)  # A Saturday
        
        slots = await _generate_availability_for_day(mock_db, test_date)
        
        # Should generate no slots for weekend
        assert len(slots) == 0

    @pytest.mark.asyncio
    async def test_cached_availability_with_service_filter(self, mock_db):
        """Test that service-specific requests bypass cache."""
        # Mock a cached availability document
        mock_doc = Mock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "slots": {"08:00": "free", "08:30": "free"},
            "mechanics": {"mechanic_1": True},
            "cached_at": datetime.utcnow(),
            "generated_dynamically": True
        }
        
        mock_db.collection.return_value.document.return_value.get.return_value = mock_doc
        
        test_date = date(2025, 6, 16)
        
        # Without service_id, should return cached result
        cached_result = await _get_cached_availability(mock_db, test_date)
        assert cached_result is not None
        assert len(cached_result) == 2
        
        # With service_id, should bypass cache
        cached_result_with_service = await _get_cached_availability(mock_db, test_date, "service_1")
        assert cached_result_with_service is None

    @pytest.mark.asyncio
    async def test_expired_cache_handling(self, mock_db):
        """Test that expired cache is ignored."""
        # Mock an expired cached availability document
        mock_doc = Mock()
        mock_doc.exists = True
        expired_time = datetime.utcnow() - timedelta(hours=2)  # 2 hours ago
        mock_doc.to_dict.return_value = {
            "slots": {"08:00": "free", "08:30": "free"},
            "mechanics": {"mechanic_1": True},
            "cached_at": expired_time,
            "generated_dynamically": True
        }
        
        mock_db.collection.return_value.document.return_value.get.return_value = mock_doc
        
        test_date = date(2025, 6, 16)
        
        # Should return None for expired cache
        cached_result = await _get_cached_availability(mock_db, test_date)
        assert cached_result is None
