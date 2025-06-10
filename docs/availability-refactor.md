# Availability System Refactor

## Overview

The availability system has been refactored from a **pre-seeded weekly approach** to a **dynamic generation system** that allows unlimited booking horizons while maintaining performance through intelligent caching.

## Problem Solved

**Previous Issue**: The original system used a weekly Cloud Scheduler job to pre-seed availability for only the next week, limiting customers to booking appointments within a 7-day window.

**Solution**: Dynamic availability generation based on mechanic schedules, allowing customers to book appointments as far in advance as needed.

## Architecture Changes

### Before (Pre-seeded System)
```
Cloud Scheduler (Weekly) → Seed Availability → Firestore Documents → API Response
```

### After (Dynamic System)
```
API Request → Generate from Mechanic Schedules → Check Existing Bookings → Cache Result → API Response
```

## Key Components

### 1. Dynamic Availability Generation

**File**: `backend/app/routers/availability.py`

The `_generate_availability_for_day()` function:
- Queries active mechanics and their schedules
- Generates time slots based on working hours
- Filters by service specialties (if service_id provided)
- Checks existing bookings to mark slots as unavailable
- Returns real-time availability

### 2. Intelligent Caching

**Cache Strategy**:
- 1-hour TTL for general availability
- Service-specific requests bypass cache (for accuracy)
- Cache invalidation on new bookings
- Backward compatibility with old seeded data

**Cache Markers**:
- `generated_dynamically: true` - Identifies new dynamic cache
- `cached_at` - Timestamp for TTL validation

### 3. Enhanced Booking Validation

**File**: `backend/app/routers/bookings.py`

The booking process now:
1. Validates availability dynamically before booking
2. Checks for mechanic specialties matching the service
3. Uses transactional booking with conflict detection
4. Updates cache to reflect new bookings

## API Changes

### Availability Endpoint

**URL**: `GET /availability`

**Parameters**:
- `date` (required): Date in YYYY-MM-DD format
- `service_id` (optional): Filter by service to show only qualified mechanics

**Example Requests**:
```bash
# General availability for a date
GET /availability?date=2025-12-25

# Service-specific availability
GET /availability?date=2025-12-25&service_id=3ZxPyWEqWFBEOi0kk2DO
```

**Response Format** (unchanged):
```json
[
  {
    "start": "2025-12-25T08:00:00",
    "end": "2025-12-25T08:00:00", 
    "is_free": true,
    "mechanic_id": "mechanic_123"
  }
]
```

## Benefits

### 1. Unlimited Booking Horizon
- Customers can book appointments months in advance
- No dependency on weekly seeding jobs
- Automatic availability based on mechanic schedules

### 2. Real-time Accuracy
- Availability always reflects current mechanic schedules
- Immediate updates when schedules change
- No stale pre-seeded data

### 3. Service-Aware Filtering
- Show only mechanics qualified for specific services
- Improved user experience with relevant options
- Better resource allocation

### 4. Performance Optimization
- Smart caching reduces database queries
- 1-hour TTL balances freshness and performance
- Efficient conflict detection during booking

### 5. Operational Benefits
- Reduced maintenance overhead
- No weekly job monitoring required
- Easier schedule management for mechanics

## Backward Compatibility

The refactor maintains full backward compatibility:

- **Frontend**: No changes required to existing frontend code
- **API**: Same endpoint URLs and response formats
- **Seeding**: `/availability/seed` endpoint still available for manual use
- **Data**: Existing availability documents work alongside new dynamic generation

## Migration Strategy

### Phase 1: Core Refactor ✅
- [x] Dynamic availability generation
- [x] Intelligent caching system
- [x] Updated booking validation
- [x] Service filtering support

### Phase 2: Optimization (Future)
- [ ] Date range availability requests
- [ ] Advanced caching strategies
- [ ] Performance monitoring and metrics

### Phase 3: Cleanup (Future)
- [ ] Make weekly seeding optional
- [ ] Admin tools for availability management
- [ ] Remove legacy code paths

## Testing

**Test File**: `backend/tests/test_dynamic_availability.py`

Key test scenarios:
- Dynamic generation for weekdays vs weekends
- Service filtering functionality
- Cache TTL and expiration handling
- Booking conflict detection

**Run Tests**:
```bash
cd backend
python -m pytest tests/test_dynamic_availability.py -v
```

## Configuration

### Environment Variables

No new environment variables required. The system uses existing:
- Firestore configuration
- Mechanic schedule data
- Service definitions

### Cache Settings

Current cache TTL: **1 hour**

To modify, update the TTL check in `_get_cached_availability()`:
```python
if cache_age.total_seconds() > 3600:  # 1 hour TTL
```

## Monitoring

### Key Metrics to Monitor

1. **Availability Request Latency**
   - Target: < 200ms for cached requests
   - Target: < 500ms for dynamic generation

2. **Cache Hit Rate**
   - Target: > 80% for general availability requests
   - Expected: 0% for service-specific requests (by design)

3. **Booking Success Rate**
   - Monitor for conflicts due to race conditions
   - Should remain > 99% with proper transaction handling

### Logging

The system logs:
- Cache hits/misses
- Dynamic generation events
- Booking conflicts and resolutions
- Performance metrics

## Troubleshooting

### Common Issues

1. **Slow Availability Requests**
   - Check Firestore indexes for mechanic queries
   - Monitor cache hit rates
   - Verify mechanic schedule data quality

2. **Booking Conflicts**
   - Review transaction isolation
   - Check for concurrent booking attempts
   - Validate mechanic specialty assignments

3. **Inconsistent Availability**
   - Verify mechanic schedule updates
   - Check cache invalidation logic
   - Review booking status transitions

### Debug Commands

```bash
# Test availability generation
curl "http://localhost:8080/availability?date=2025-06-16"

# Test service filtering
curl "http://localhost:8080/availability?date=2025-06-16&service_id=SERVICE_ID"

# Check cache status (via Firestore console)
# Look for documents with "generated_dynamically": true
```

## Future Enhancements

### Planned Improvements

1. **Bulk Availability Requests**
   - Support date ranges: `?from_date=2025-06-01&to_date=2025-06-07`
   - Optimized for calendar views

2. **Advanced Caching**
   - Service-specific cache with shorter TTL
   - Predictive cache warming for popular dates
   - Redis integration for high-traffic scenarios

3. **Schedule Management**
   - Real-time schedule updates
   - Holiday and exception handling
   - Mechanic availability preferences

4. **Analytics Integration**
   - Availability request patterns
   - Popular booking times
   - Mechanic utilization metrics

## Conclusion

The availability system refactor successfully addresses the original limitation while improving system reliability, performance, and user experience. The dynamic approach provides unlimited booking horizons while maintaining backward compatibility and operational simplicity.
