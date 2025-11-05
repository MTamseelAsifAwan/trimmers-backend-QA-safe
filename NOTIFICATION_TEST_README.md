# Notification Service Test Suite

This test suite validates the notification service functionality for various booking scenarios in the barber booking application.

## Test Scenarios Covered

### 1. Customer Creates Booking - Notifications to Providers
- **Shop-based booking**: Notifies shop owner for approval when customer books with a shop barber
- **Freelancer booking**: Notifies freelancer directly when customer books a home service

### 2. Provider Accepts Booking - Notification to Customer
- **Barber acceptance**: Notifies both customer and shop owner when shop barber accepts
- **Freelancer acceptance**: Notifies customer when freelancer accepts

### 3. Provider Rejects Booking - Notification Logic
- **Freelancer rejection**: Notifies customer when freelancer rejects (customer can choose another provider)
- **Shop barber rejection**: NOTIFIES ONLY SHOP OWNER when shop barber rejects (shop owner can reassign)

### 4. Shop Owner Reassigns Booking - Notifications
- **Reassignment to another barber**: Notifies new barber and customer about reassignment
- **Assignment to self**: Notifies customer of direct confirmation

### 5. Reassigned Barber Accepts/Rejects - Notify Only Shop Owner
- **Acceptance**: Notifies both customer and shop owner
- **Rejection**: NOTIFIES ONLY SHOP OWNER (so they can reassign again, not customer)

## Key Notification Rules

1. **Customer always gets notified** when booking is accepted or when freelancer rejects
2. **Shop owner gets notified** for all shop-based booking activities
3. **Customer does NOT get notified** when shop barber rejects (only shop owner does)
4. **Reassigned bookings**: Shop owner is always notified, customer only for acceptance

## Running the Tests

```bash
# Run all tests
npm test

# Run only notification tests
npm test -- notification-service-booking-scenarios.test.js

# Run with verbose output
npm test -- --verbose notification-service-booking-scenarios.test.js
```

## Test Structure

The tests use mocked services to simulate the notification logic without requiring a full database setup. Each test scenario mocks the booking service methods to call the notification service with the appropriate parameters, then verifies that the correct notifications were sent to the correct users.

## Dependencies

- Jest (testing framework)
- mongodb-memory-server (for potential future integration tests)

## Mock Strategy

- All database models are mocked to avoid complex setup
- Notification service is mocked to track calls
- Booking service methods are mocked to simulate notification logic
- Focus is on validating notification behavior, not database operations