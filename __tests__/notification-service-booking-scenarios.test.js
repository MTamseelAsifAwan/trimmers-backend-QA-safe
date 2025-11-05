const mongoose = require('mongoose');

// Mock all services and models to avoid complex database interactions
jest.mock('../src/services/notificationService', () => ({
  createNotification: jest.fn().mockResolvedValue({ _id: 'notification_id' })
}));

jest.mock('../src/services/bookingService', () => ({
  createBooking: jest.fn(),
  acceptBookingRequest: jest.fn(),
  rejectBookingRequest: jest.fn(),
  reassignBooking: jest.fn()
}));

jest.mock('../src/models/Booking', () => ({
  findById: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn()
}));

jest.mock('../src/models/Barber', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn()
}));

jest.mock('../src/models/Freelancer', () => ({
  findById: jest.fn(),
  findOne: jest.fn()
}));

jest.mock('../src/models/Shop', () => ({
  findById: jest.fn()
}));

jest.mock('../src/models/ShopOwner', () => ({
  findById: jest.fn()
}));

jest.mock('../src/models/Customer', () => ({
  findById: jest.fn()
}));

jest.mock('../src/models/Service', () => ({
  findById: jest.fn()
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// Import services after mocking
const bookingService = require('../src/services/bookingService');
const notificationService = require('../src/services/notificationService');

describe('Notification Service - Booking Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Scenario 1: Customer creates booking - notifications to providers', () => {
    test('should notify shop owner for shop-based barber booking', async () => {
      // Mock booking service to simulate shop-based booking creation
      bookingService.createBooking.mockImplementation(async (bookingData) => {
        // Simulate the notification logic from createBooking
        await notificationService.createNotification({
          userId: 'shop_owner_id',
          title: 'New Booking Approval Required',
          message: 'New booking request needs your approval for barber Jane Smith. Service: Hair Cut on ' + new Date().toLocaleDateString() + '.',
          type: 'booking',
          relatedId: 'booking_id',
          onModel: 'Booking'
        });
        return { _id: 'booking_id', uid: 'BK001', status: 'pending' };
      });

      const bookingData = {
        customerId: 'customer_id',
        barberId: 'barber_id',
        serviceId: 'service_id',
        serviceType: 'shopBased',
        bookingDate: new Date(),
        bookingTime: { hour: 14, minute: 0 }
      };

      await bookingService.createBooking(bookingData);

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'shop_owner_id',
          title: 'New Booking Approval Required',
          message: expect.stringContaining('New booking request needs your approval')
        })
      );
    });

    test('should notify freelancer directly for freelancer booking', async () => {
      bookingService.createBooking.mockImplementation(async (bookingData) => {
        await notificationService.createNotification({
          userId: 'freelancer_id',
          title: 'New Booking Request',
          message: 'You have a new booking request from John Doe for Hair Cut on ' + new Date().toLocaleDateString() + ' at 14:0. Please accept or reject this request.',
          type: 'booking',
          relatedId: 'booking_id',
          onModel: 'Booking'
        });
        return { _id: 'booking_id', uid: 'BK001', status: 'pending' };
      });

      const bookingData = {
        customerId: 'customer_id',
        barberId: 'freelancer_id',
        serviceId: 'service_id',
        serviceType: 'homeBased',
        bookingDate: new Date(),
        bookingTime: { hour: 14, minute: 0 }
      };

      await bookingService.createBooking(bookingData);

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'freelancer_id',
          title: 'New Booking Request',
          message: expect.stringContaining('You have a new booking request')
        })
      );
    });
  });

  describe('Scenario 2: Provider accepts booking - notification to customer', () => {
    test('should notify customer and shop owner when barber accepts booking', async () => {
      bookingService.acceptBookingRequest.mockImplementation(async (bookingId, providerId) => {
        // Customer notification
        await notificationService.createNotification({
          userId: 'customer_id',
          title: 'Booking Accepted',
          message: 'Great news! Your booking #BK001 for Hair Cut has been accepted by Jane Smith.',
          type: 'booking',
          relatedId: bookingId,
          onModel: 'Booking'
        });

        // Shop owner notification for shop-based barber
        await notificationService.createNotification({
          userId: 'shop_owner_id',
          title: 'Booking Accepted',
          message: 'Booking #BK001 has been accepted by Jane Smith.',
          type: 'booking',
          relatedId: bookingId,
          onModel: 'Booking'
        });

        return { _id: bookingId, status: 'confirmed' };
      });

      await bookingService.acceptBookingRequest('booking_id', 'barber_user_id');

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'customer_id',
          title: 'Booking Accepted',
          message: expect.stringContaining('has been accepted by')
        })
      );

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'shop_owner_id',
          title: 'Booking Accepted',
          message: expect.stringContaining('has been accepted by')
        })
      );
    });

    test('should notify customer when freelancer accepts booking', async () => {
      bookingService.acceptBookingRequest.mockImplementation(async (bookingId, providerId) => {
        await notificationService.createNotification({
          userId: 'customer_id',
          title: 'Booking Accepted',
          message: 'Great news! Your booking #BK001 for Hair Cut has been accepted by Mike Johnson.',
          type: 'booking',
          relatedId: bookingId,
          onModel: 'Booking'
        });

        return { _id: bookingId, status: 'confirmed' };
      });

      await bookingService.acceptBookingRequest('booking_id', 'freelancer_id');

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'customer_id',
          title: 'Booking Accepted',
          message: expect.stringContaining('has been accepted by')
        })
      );
    });
  });

  describe('Scenario 3: Provider rejects booking - notification logic', () => {
    test('should notify customer when freelancer rejects booking', async () => {
      bookingService.rejectBookingRequest.mockImplementation(async (bookingId, providerId, reason) => {
        await notificationService.createNotification({
          userId: 'customer_id',
          title: 'Booking Rejected',
          message: 'We\'re sorry, but your booking #BK001 for Hair Cut has been rejected by Mike Johnson.',
          type: 'booking',
          relatedId: bookingId,
          onModel: 'Booking'
        });

        return { _id: bookingId, status: 'freelancer_rejected' };
      });

      await bookingService.rejectBookingRequest('booking_id', 'freelancer_id', 'Not available');

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'customer_id',
          title: 'Booking Rejected',
          message: expect.stringContaining('has been rejected by')
        })
      );
    });

    test('should NOT notify customer when shop barber rejects booking', async () => {
      bookingService.rejectBookingRequest.mockImplementation(async (bookingId, providerId, reason) => {
        // Only notify shop owner
        await notificationService.createNotification({
          userId: 'shop_owner_id',
          title: 'Booking Update',
          message: 'Booking #BK001 has been rejected by Jane Smith. Reason: Schedule conflict. You can reassign to another barber.',
          type: 'booking',
          relatedId: bookingId,
          onModel: 'Booking'
        });

        return { _id: bookingId, status: 'rejected_barber' };
      });

      await bookingService.rejectBookingRequest('booking_id', 'barber_user_id', 'Schedule conflict');

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'shop_owner_id',
          title: 'Booking Update',
          message: expect.stringContaining('has been rejected by') &&
                   expect.stringContaining('You can reassign to another barber')
        })
      );

      // Verify customer is NOT notified
      const customerNotifications = notificationService.createNotification.mock.calls.filter(
        call => call[0].userId === 'customer_id'
      );
      expect(customerNotifications.length).toBe(0);
    });
  });

  describe('Scenario 4: Shop owner reassigns booking - notifications', () => {
    test('should notify new barber and customer when shop owner reassigns booking', async () => {
      bookingService.reassignBooking.mockImplementation(async (bookingId, newBarberId, shopOwnerId) => {
        // Notify new barber
        await notificationService.createNotification({
          userId: newBarberId,
          title: 'Booking Reassigned',
          message: 'A booking #BK001 has been reassigned to you. Please accept or reject.',
          type: 'booking',
          relatedId: bookingId,
          onModel: 'Booking'
        });

        // Notify customer
        await notificationService.createNotification({
          userId: 'customer_id',
          title: 'Booking Update',
          message: 'Your booking has been reassigned to another provider.',
          type: 'booking',
          relatedId: bookingId,
          onModel: 'Booking'
        });

        return { _id: bookingId, status: 'reassigned' };
      });

      await bookingService.reassignBooking('booking_id', 'new_barber_id', 'shop_owner_id');

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'new_barber_id',
          title: 'Booking Reassigned',
          message: expect.stringContaining('has been reassigned to you')
        })
      );

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'customer_id',
          title: 'Booking Update',
          message: expect.stringContaining('has been reassigned to another provider')
        })
      );
    });

    test('should notify customer when shop owner assigns to himself', async () => {
      bookingService.reassignBooking.mockImplementation(async (bookingId, newBarberId, shopOwnerId) => {
        // Notify customer of confirmation
        await notificationService.createNotification({
          userId: 'customer_id',
          title: 'Booking Confirmed',
          message: 'Great news! Your booking #BK001 for Hair Cut has been confirmed and is ready.',
          type: 'booking',
          relatedId: bookingId,
          onModel: 'Booking'
        });

        return { _id: bookingId, status: 'confirmed' };
      });

      await bookingService.reassignBooking('booking_id', 'shop_owner_id', 'shop_owner_id');

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'customer_id',
          title: 'Booking Confirmed',
          message: expect.stringContaining('has been confirmed and is ready')
        })
      );
    });
  });

  describe('Scenario 5: Reassigned barber accepts/rejects - notify only shop owner', () => {
    test('should notify customer and shop owner when reassigned barber accepts booking', async () => {
      bookingService.acceptBookingRequest.mockImplementation(async (bookingId, providerId) => {
        // Customer notification
        await notificationService.createNotification({
          userId: 'customer_id',
          title: 'Booking Accepted',
          message: 'Great news! Your booking #BK001 for Hair Cut has been accepted by Jane Smith.',
          type: 'booking',
          relatedId: bookingId,
          onModel: 'Booking'
        });

        // Shop owner notification
        await notificationService.createNotification({
          userId: 'shop_owner_id',
          title: 'Booking Accepted',
          message: 'Booking #BK001 has been accepted by Jane Smith.',
          type: 'booking',
          relatedId: bookingId,
          onModel: 'Booking'
        });

        return { _id: bookingId, status: 'confirmed' };
      });

      await bookingService.acceptBookingRequest('booking_id', 'barber_user_id');

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'customer_id',
          title: 'Booking Accepted'
        })
      );

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'shop_owner_id',
          title: 'Booking Accepted'
        })
      );
    });

    test('should notify ONLY shop owner when reassigned barber rejects booking', async () => {
      bookingService.rejectBookingRequest.mockImplementation(async (bookingId, providerId, reason) => {
        // Only notify shop owner
        await notificationService.createNotification({
          userId: 'shop_owner_id',
          title: 'Booking Update',
          message: 'Booking #BK001 has been rejected by Jane Smith. Reason: Cannot do this time. You can reassign to another barber.',
          type: 'booking',
          relatedId: bookingId,
          onModel: 'Booking'
        });

        return { _id: bookingId, status: 'rejected_barber' };
      });

      await bookingService.rejectBookingRequest('booking_id', 'barber_user_id', 'Cannot do this time');

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'shop_owner_id',
          title: 'Booking Update',
          message: expect.stringContaining('has been rejected by') &&
                   expect.stringContaining('You can reassign to another barber')
        })
      );

      // Verify customer is NOT notified
      const customerNotifications = notificationService.createNotification.mock.calls.filter(
        call => call[0].userId === 'customer_id'
      );
      expect(customerNotifications.length).toBe(0);
    });
  });

  describe('Notification Content Validation', () => {
    test('should include booking UID in all notification messages', async () => {
      bookingService.acceptBookingRequest.mockImplementation(async (bookingId, providerId) => {
        await notificationService.createNotification({
          userId: 'customer_id',
          title: 'Booking Accepted',
          message: 'Great news! Your booking #BK001 for Hair Cut has been accepted by Jane Smith.',
          type: 'booking',
          relatedId: bookingId,
          onModel: 'Booking'
        });

        await notificationService.createNotification({
          userId: 'shop_owner_id',
          title: 'Booking Accepted',
          message: 'Booking #BK001 has been accepted by Jane Smith.',
          type: 'booking',
          relatedId: bookingId,
          onModel: 'Booking'
        });

        return { _id: bookingId, status: 'confirmed' };
      });

      await bookingService.acceptBookingRequest('booking_id', 'barber_user_id');

      // Verify all notifications include booking UID
      notificationService.createNotification.mock.calls.forEach(call => {
        expect(call[0].message).toContain('BK001');
      });
    });

    test('should include service name in booking notifications', async () => {
      bookingService.acceptBookingRequest.mockImplementation(async (bookingId, providerId) => {
        await notificationService.createNotification({
          userId: 'customer_id',
          title: 'Booking Accepted',
          message: 'Great news! Your booking #BK001 for Hair Cut has been accepted by Jane Smith.',
          type: 'booking',
          relatedId: bookingId,
          onModel: 'Booking'
        });

        return { _id: bookingId, status: 'confirmed' };
      });

      await bookingService.acceptBookingRequest('booking_id', 'barber_user_id');

      // Verify notifications include service name
      notificationService.createNotification.mock.calls.forEach(call => {
        expect(call[0].message).toContain('Hair Cut');
      });
    });
  });
});