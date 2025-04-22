# Firestore Data Model for Mechanic Scheduling App

## Collections & Documents

### 1. `services` collection

Documents represent available service types offered by mechanics.

```typescript
interface Service {
  name: string;           // Display name of the service 
  minutes: number;        // Duration in minutes
  description: string;    // Detailed description
  price: number;          // Base price
  active: boolean;        // Is this service currently offered
  created_at: Timestamp;  // When this service was added
  updated_at: Timestamp;  // Last updated
}
```

### 2. `availability` collection

Documents represent available slots for a specific day.

```typescript
interface Availability {
  day: string;            // ISO date string (YYYY-MM-DD)
  slots: {                // Map of time slots
    [time: string]: "free" | "booked" | "blocked";  // e.g. "09:00": "free"
  };
  mechanics: {            // Map of mechanic IDs assigned to this day
    [mechanicId: string]: boolean;
  };
  created_at: Timestamp;  // When this availability was published
  updated_at: Timestamp;  // Last updated
}
```

### 3. `bookings` collection

Documents represent customer bookings.

```typescript
interface Booking {
  service_id: string;     // Reference to service
  slot_start: Timestamp;  // Start time of appointment
  slot_end: Timestamp;    // End time (computed from service duration)
  mechanic_id: string;    // Assigned mechanic (optional)
  customer_name: string;  // Customer's name
  customer_email: string; // Customer's email (for authentication)
  customer_phone: string; // Customer's phone (optional)
  status: "confirmed" | "completed" | "cancelled" | "no-show";
  notes: string;          // Any special requests or notes
  created_at: Timestamp;  // When booking was created
  updated_at: Timestamp;  // Last updated
}
```

### 4. `mechanics` collection

Documents represent mechanics/staff who perform services.

```typescript
interface Mechanic {
  name: string;           // Full name
  email: string;          // Email address
  specialties: string[];  // Array of service IDs they specialize in
  schedule: {             // Regular working schedule
    monday: { start: string, end: string } | null,
    tuesday: { start: string, end: string } | null,
    // ... other days
  };
  active: boolean;        // Is this mechanic currently working
  created_at: Timestamp;  // When this record was created
  updated_at: Timestamp;  // Last updated
}
```

### 5. `users` collection

Documents represent user accounts (customers and staff).

```typescript
interface User {
  email: string;          // Email address (from Firebase Auth)
  name: string;           // Display name
  phone: string;          // Contact phone
  role: "customer" | "mechanic" | "admin";  // Access level
  mechanic_id?: string;   // Reference to mechanics collection if role="mechanic"
  created_at: Timestamp;  // Account creation time
  updated_at: Timestamp;  // Last updated
}
```

## Data Access Patterns

### Common Queries

1. Get available slots for a date:

   ```
   db.collection("availability").doc("2023-05-01").get()
   ```

2. Get all services:

   ```
   db.collection("services").where("active", "==", true).get()
   ```

3. Get a customer's bookings:

   ```
   db.collection("bookings").where("customer_email", "==", user.email).get()
   ```

4. Get bookings for a specific day:

   ```
   const dayStart = new Date("2023-05-01T00:00:00");
   const dayEnd = new Date("2023-05-01T23:59:59");
   db.collection("bookings")
     .where("slot_start", ">=", dayStart)
     .where("slot_start", "<=", dayEnd)
     .get()
   ```

5. Get available mechanics for a service:

   ```
   db.collection("mechanics")
     .where("specialties", "array-contains", "oil-change")
     .where("active", "==", true)
     .get()
   ```

## Data Consistency Considerations

1. **Transactional Booking Creation**: Always use transactions when creating bookings to ensure the slot is still available.

2. **Denormalization Strategy**: Store the necessary data in each document to minimize reads. For example:
   - Store mechanic name in booking document to avoid additional reads
   - Store service details in bookings for historical accuracy

3. **Data Validation**: Implement strict validation in both security rules and application code.

4. **Composite Indexes**: Create indexes for common queries like:
   - bookings by customer and date
   - bookings by mechanic and date
   - services by category and active status
