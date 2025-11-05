// src/services/shopOwnerService.js
const ShopOwner = require('../models/ShopOwner');
const { User, ROLES } = require('../models/User');
const Shop = require('../models/Shop');
const logger = require('../utils/logger');
const fileUploadService = require('./fileUploadService');
const Booking = require('../models/Booking');
const mongoose = require('mongoose');

/**
 * ShopOwnerService provides methods for shop owner management
 */
class ShopOwnerService {
  /**
   * Create a new shop owner profile
   * @param {string} userId - User ID
   * @param {Object} shopOwnerData - Shop owner data
   * @returns {Promise<Object>} - Created shop owner
   */
  async createShopOwnerProfile(userId, shopOwnerData) {
    try {
      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user is a shop owner
      if (user.role !== ROLES.SHOP_OWNER) {
        throw new Error('Only users with shop_owner role can have a shop owner profile');
      }

      // Check if shop owner profile already exists
      const existingShopOwner = await ShopOwner.findOne({ userId });
      if (existingShopOwner) {
        throw new Error('Shop owner profile already exists for this user');
      }

      // Validate required fields
      if (!shopOwnerData.businessName) {
        throw new Error('Business name is required');
      }
      if (!shopOwnerData.businessAddress) {
        throw new Error('Business address is required');
      }
      if (!shopOwnerData.businessPhone) {
        throw new Error('Business phone is required');
      }
      if (!shopOwnerData.businessEmail) {
        throw new Error('Business email is required');
      }
      if (!shopOwnerData.taxId) {
        throw new Error('Tax ID is required');
      }
      if (!shopOwnerData.businessRegistrationNumber) {
        throw new Error('Business registration number is required');
      }
      if (!shopOwnerData.countryId) {
        throw new Error('Country Id is required');
      }

      // Upload files if they exist
      let businessLogoUrl = null;
      let businessRegistrationDocUrl = null;

      if (shopOwnerData.businessLogoBlob) {
        businessLogoUrl = await fileUploadService.uploadFile(
          shopOwnerData.businessLogoBlob.buffer,
          shopOwnerData.businessLogoBlob.originalname,
          'shop-owner-business-logo'
        );
      }

      if (shopOwnerData.businessRegistrationDocBlob) {
        businessRegistrationDocUrl = await fileUploadService.uploadFile(
          shopOwnerData.businessRegistrationDocBlob.buffer,
          shopOwnerData.businessRegistrationDocBlob.originalname,
          'shop-owner-documents'
        );
      }

      // Create new shop owner
      const shopOwner = new ShopOwner({
        userId,
        businessName: shopOwnerData.businessName,
        businessAddress: shopOwnerData.businessAddress,
        businessPhone: shopOwnerData.businessPhone,
        businessEmail: shopOwnerData.businessEmail,
        businessLogo: businessLogoUrl,
        businessLogoBlob: shopOwnerData.businessLogoBlob || null,
        businessRegistrationDoc: businessRegistrationDocUrl,
        businessRegistrationDocBlob: shopOwnerData.businessRegistrationDocBlob || null,
        taxId: shopOwnerData.taxId,
        businessRegistrationNumber: shopOwnerData.businessRegistrationNumber,
        stripeAccountId: shopOwnerData.stripeAccountId || null,
        verificationStatus: 'pending',
        verificationDocuments: shopOwnerData.verificationDocuments || [],
        countryId: shopOwnerData.countryId
      });

      await shopOwner.save();

      return shopOwner;
    } catch (error) {
      logger.error(`Create shop owner profile error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get shop owner by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Shop owner data
   */
  async getShopOwnerByUserId(userId) {
    try {
      const shopOwner = await ShopOwner.findOne({ userId });

      if (!shopOwner) {
        return null;
      }

      return shopOwner;
    } catch (error) {
      logger.error(`Get shop owner by user ID error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get shop owner by ID
   * @param {string} id - Shop owner ID
   * @returns {Promise<Object>} - Shop owner data
   */
  async getShopOwnerById(id) {
    try {
      const shopOwner = await ShopOwner.findById(id)
        .populate('userId', '-password -emailVerificationToken -emailVerificationExpiry -resetPasswordToken -resetPasswordExpiry');

      if (!shopOwner) {
        throw new Error('Shop owner profile not found');
      }

      return shopOwner;
    } catch (error) {
      logger.error(`Get shop owner by ID error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get shop owner by UID
   * @param {string} uid - Shop owner UID
   * @returns {Promise<Object>} - Shop owner data
   */
  async getShopOwnerByUid(uid) {
    try {
      const shopOwner = await ShopOwner.findOne({ uid })
        .populate('userId', '-password -emailVerificationToken -emailVerificationExpiry -resetPasswordToken -resetPasswordExpiry');

      if (!shopOwner) {
        throw new Error('Shop owner profile not found');
      }

      return shopOwner;
    } catch (error) {
      logger.error(`Get shop owner by UID error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update shop owner profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Shop owner data to update
   * @returns {Promise<Object>} - Updated shop owner
   */
  async updateShopOwnerProfile(userId, updateData) {
    try {
      let shopOwner = null;

      if (mongoose.Types.ObjectId.isValid(userId)) {
        shopOwner = await ShopOwner.findById(userId);
      }

      if (!shopOwner) {
        shopOwner = await ShopOwner.findOne({ userId });
      }

      if (!shopOwner) {
        throw new Error('Shop owner profile not found');
      }

      const assignIfPresent = (field, value) => {
        if (value !== undefined) {
          shopOwner[field] = value;
        }
      };

      assignIfPresent('firstName', updateData.firstName);
      assignIfPresent('lastName', updateData.lastName);
      assignIfPresent('email', updateData.email);
      assignIfPresent('profileImage', updateData.profileImage);
      assignIfPresent('businessName', updateData.businessName);
      assignIfPresent('businessAddress', updateData.businessAddress);
      assignIfPresent('businessPhone', updateData.businessPhone);
      assignIfPresent('businessEmail', updateData.businessEmail);
      assignIfPresent('businessLogo', updateData.businessLogo);
      assignIfPresent('businessLogoBlob', updateData.businessLogoBlob);
      assignIfPresent('businessRegistrationDoc', updateData.businessRegistrationDoc);
      assignIfPresent('businessRegistrationDocBlob', updateData.businessRegistrationDocBlob);
      assignIfPresent('taxId', updateData.taxId);
      assignIfPresent('businessRegistrationNumber', updateData.businessRegistrationNumber);
      assignIfPresent('stripeAccountId', updateData.stripeAccountId);
      assignIfPresent('countryId', updateData.countryId);
      assignIfPresent('status', updateData.status);

      if (Array.isArray(updateData.verificationDocuments)) {
        const existingDocs = shopOwner.verificationDocuments || [];
        const newDocs = updateData.verificationDocuments.filter(
          doc => !existingDocs.includes(doc)
        );
        shopOwner.verificationDocuments = [...existingDocs, ...newDocs];
      }

      if (updateData.profile) {
        if (!shopOwner.profile) shopOwner.profile = {};
        assignIfPresent('profile', {
          ...shopOwner.profile,
          phoneNumber: updateData.profile.phoneNumber ?? shopOwner.profile.phoneNumber,
          address: updateData.profile.address ?? shopOwner.profile.address,
          city: updateData.profile.city ?? shopOwner.profile.city,
          zipCode: updateData.profile.zipCode ?? shopOwner.profile.zipCode
        });
      }

      await shopOwner.save();

      return shopOwner;
    } catch (error) {
      logger.error(`Update shop owner profile error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update shop owner verification status (admin only)
   * @param {string} id - Shop owner ID
   * @param {string} status - New verification status
   * @param {string} [rejectionReason] - Reason for rejection (if status is 'rejected')
   * @returns {Promise<Object>} - Updated shop owner
   */
  async updateVerificationStatus(id, status, rejectionReason = null) {
    try {
      const shopOwner = await ShopOwner.findById(id);

      if (!shopOwner) {
        throw new Error('Shop owner profile not found');
      }

      // Validate status
      if (!['pending', 'verified', 'rejected'].includes(status)) {
        throw new Error('Invalid verification status');
      }

      // Update status
      shopOwner.verificationStatus = status;

      // Set rejection reason if applicable
      if (status === 'rejected' && rejectionReason) {
        shopOwner.rejectionReason = rejectionReason;
      } else {
        shopOwner.rejectionReason = null;
      }

      await shopOwner.save();

      return shopOwner;
    } catch (error) {
      logger.error(`Update verification status error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove verification document
   * @param {string} userId - User ID
   * @param {string} documentUrl - Document URL to remove
   * @returns {Promise<Object>} - Updated shop owner
   */
  async removeVerificationDocument(userId, documentUrl) {
    try {
      const shopOwner = await ShopOwner.findOne({ userId });

      if (!shopOwner) {
        throw new Error('Shop owner profile not found');
      }

      // Remove document
      shopOwner.verificationDocuments = shopOwner.verificationDocuments.filter(
        doc => doc !== documentUrl
      );

      await shopOwner.save();

      return shopOwner;
    } catch (error) {
      logger.error(`Remove verification document error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all shops owned by a shop owner
   * @param {string} shopOwnerId - Shop owner ID
   * @returns {Promise<Array>} - List of shops
   */
  async getShopsByOwner(shopOwnerId) {
    try {
      const shops = await Shop.find({ ownerId: shopOwnerId });
      return shops;
    } catch (error) {
      logger.error(`Get shops by owner error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all shop owners with pagination and filtering
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Paginated list of shop owners
   */
  async getShopOwners(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search,
        verificationStatus
      } = options;

      logger.debug('getShopOwners called with options:', options);

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build filter
      const filter = {};

      if (verificationStatus) {
        filter.verificationStatus = verificationStatus;
      }

      logger.debug('Built filter:', filter);

      let userIds = [];
      if (search) {
        // Find users matching the search criteria
        const users = await User.find({
          $or: [
            { email: { $regex: search, $options: 'i' } },
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { uid: { $regex: search, $options: 'i' } }
          ]
        }).select('_id');

        userIds = users.map(user => user._id);

        // Also search in business name and other shop owner fields
        const shopOwnerFilter = {
          $or: [
            { businessName: { $regex: search, $options: 'i' } },
            { businessEmail: { $regex: search, $options: 'i' } },
            { businessPhone: { $regex: search, $options: 'i' } },
            { uid: { $regex: search, $options: 'i' } }
          ]
        };

        if (userIds.length > 0) {
          shopOwnerFilter.$or.push({ userId: { $in: userIds } });
        }

        // Combine filters
        filter.$or = shopOwnerFilter.$or;
      }

      // Build sort
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      logger.debug('Final filter:', filter);
      logger.debug('Sort:', sort);

      // Execute query
      const shopOwners = await ShopOwner.find(filter)
        .populate('userId', '-password -emailVerificationToken -emailVerificationExpiry -resetPasswordToken -resetPasswordExpiry')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      logger.debug('Query result - found shopOwners:', shopOwners.length);
      if (shopOwners.length > 0) {
        logger.debug('First shopOwner:', shopOwners[0]);
      }

      // Get total count
      const total = await ShopOwner.countDocuments(filter);

      logger.debug('Total count:', total);

      return {
        shopOwners,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      };
    } catch (error) {
      logger.error(`Get shop owners error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete shop owner profile
   * @param {string} id - Shop owner ID
   * @returns {Promise<boolean>} - Success status
   */
  async deleteShopOwner(id) {
    try {
      // Find shop owner
      const shopOwner = await ShopOwner.findById(id);
      if (!shopOwner) {
        throw new Error('Shop owner profile not found');
      }

      // Find all shops owned by this shop owner
      const shops = await Shop.find({ ownerId: id });

      if (shops.length > 0) {
        throw new Error(`Cannot delete shop owner with ${shops.length} active shops. Delete the shops first.`);
      }

      // Delete shop owner
      await ShopOwner.findByIdAndDelete(id);

      return true;
    } catch (error) {
      logger.error(`Delete shop owner error: ${error.message}`);
      throw error;
    }
  }

  /**
 * Add verification document to shop owner profile
 * @param {string} userId - User ID
 * @param {string} documentUrl - Document URL
 * @param {string} documentType - Document type
 * @returns {Promise<Object>} - Updated shop owner profile
 */
  async addVerificationDocument(id, documentUrl, documentType) {
    // Find shop owner by user ID
    const shopOwner = await ShopOwner.findOne({ userId: id }).populate('user');
    logger.debug('Shop owner found:', shopOwner);
    if (!shopOwner) {
      throw new Error('Shop owner profile not found');
    }

    // Add document URL to verification documents array (store as string)
    if (!shopOwner.verificationDocuments) {
      shopOwner.verificationDocuments = [];
    }

    shopOwner.verificationDocuments.push(documentUrl);

    // If verification status is rejected, set it to pending
    if (shopOwner.verificationStatus === 'rejected') {
      shopOwner.verificationStatus = 'pending';
      shopOwner.rejectionReason = null;
    }

    // Save and return updated shop owner
    return await shopOwner.save();
  }
  /**
   * Get booking by ID
   * @param {string} bookingId - Booking ID
   * @returns {Promise<Object>} - Booking document
   */
  async getBookingById(bookingId) {
    try {
      const booking = await Booking.findById(bookingId);
      return booking;
    } catch (error) {
      logger.error(`Get booking by ID error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Assign a booking to a barber/freelancer
   * @param {string} bookingId - Booking ID
   * @param {string} barberId - Barber/Freelancer ID
   * @returns {Promise<Object>} - Updated booking
   */
  async assignBookingToBarber(bookingId, barberId) {
    try {
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }
      // Only allow assignment if booking is pending
      if (booking.status !== 'pending') {
        throw new Error('Booking is not in a pending state');
      }
      // Enforce that assignment matches the customer-selected barber
      if (booking.barberId && booking.barberId.toString() !== barberId.toString()) {
        throw new Error('Cannot assign to a different barber than selected by the customer');
      }
      booking.barberId = barberId;
      booking.status = 'assigned';
      await booking.save();
      return booking;
    } catch (error) {
      logger.error(`Assign booking to barber error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reassign a rejected booking (freelancer_rejected or rejected_barber) to another barber
   * @param {string} bookingId - Booking ID
   * @param {string} newBarberId - New barber ID
   * @param {string} shopOwnerId - Shop owner ID (for validation)
   * @returns {Promise<Object>} - Updated booking
   */
  async reassignBooking(bookingId, newBarberId, shopOwnerId) {
    try {
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Only allow reassignment if booking is rejected by freelancer or barber
      if (!['freelancer_rejected', 'rejected_barber'].includes(booking.status)) {
        throw new Error('Booking is not in a rejected state that can be reassigned');
      }

      // Validate that the shop owner owns this booking's shop
      if (!booking.shopId) {
        throw new Error('Booking is not associated with a shop');
      }

      const shop = await Shop.findById(booking.shopId);
      if (!shop || shop.ownerId.toString() !== shopOwnerId.toString()) {
        throw new Error('You are not authorized to reassign this booking');
      }

      // Reassign to new barber
      booking.barberId = newBarberId;
      booking.status = 'assigned';
      await booking.save();

      return booking;
    } catch (error) {
      logger.error(`Reassign booking error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Accept a booking by shop owner
   * @param {string} bookingId - Booking ID
   * @param {string} shopOwnerId - Shop owner ID (for validation)
   * @returns {Promise<Object>} - Updated booking
   */
  async acceptBooking(bookingId, shopOwnerId) {
    try {
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Only allow acceptance if booking is in acceptable states
      if (!['pending', 'rejected_barber', 'freelancer_rejected'].includes(booking.status)) {
        throw new Error('Booking is not in a state that can be accepted by shop owner');
      }

      // Validate that the shop owner owns this booking's shop
      if (!booking.shopId) {
        throw new Error('Booking is not associated with a shop');
      }

      const shop = await Shop.findById(booking.shopId);
      if (!shop || shop.ownerId.toString() !== shopOwnerId.toString()) {
        throw new Error('You are not authorized to accept this booking');
      }

      // Accept the booking
      booking.status = 'accepted';
      await booking.save();

      return booking;
    } catch (error) {
      logger.error(`Accept booking error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reject a booking by shop owner
   * @param {string} bookingId - Booking ID
   * @param {string} shopOwnerId - Shop owner ID (for validation)
   * @returns {Promise<Object>} - Updated booking
   */
  async rejectBooking(bookingId, shopOwnerId) {
    try {
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Only allow rejection if booking is in rejectable states
      if (!['pending', 'rejected_barber', 'freelancer_rejected'].includes(booking.status)) {
        throw new Error('Booking is not in a state that can be rejected by shop owner');
      }

      // Validate that the shop owner owns this booking's shop
      if (!booking.shopId) {
        throw new Error('Booking is not associated with a shop');
      }

      const shop = await Shop.findById(booking.shopId);
      if (!shop || shop.ownerId.toString() !== shopOwnerId.toString()) {
        throw new Error('You are not authorized to reject this booking');
      }

      // Reject the booking
      booking.status = 'shop_owner_rejected';
      await booking.save();

      return booking;
    } catch (error) {
      logger.error(`Reject booking error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get requested bookings for shop owner's shops
   * @param {string} shopOwnerId - Shop owner ID
   * @returns {Promise<Array>} - List of requested bookings
   */
  async getRequestedBookings(shopOwnerId) {
    try {
      // Get all shops owned by this shop owner
      const shops = await Shop.find({ ownerId: shopOwnerId });
      const shopIds = shops.map(shop => shop._id);

      // Find all bookings for these shops that are in requested/pending state
      const bookings = await Booking.find({
        shopId: { $in: shopIds },
        status: { $in: ['pending'] }
      })
      .populate('customerId', 'firstName lastName')
      .populate('barberId', 'firstName lastName')
      .populate('serviceId', 'name price duration')
      .populate('shopId', 'name address')
      .sort({ createdAt: -1 });

      return bookings;
    } catch (error) {
      logger.error(`Get requested bookings error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all bookings for shop owner's shops with pagination
   * @param {string} shopOwnerId - Shop owner ID
   * @param {Object} options - Query options (status, page, limit)
   * @returns {Promise<Object>} - Paginated list of bookings
   */
  async getAllShopBookings(shopOwnerId, options = {}) {
    try {
      const { status, page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;

      // Get all shops owned by this shop owner
      const shops = await Shop.find({ ownerId: shopOwnerId });
      const shopIds = shops.map(shop => shop._id);

      // Build query
      const query = { shopId: { $in: shopIds } };
      if (status) {
        query.status = status;
      }

      // Get bookings with pagination
      const [bookings, total] = await Promise.all([
        Booking.find(query)
          .populate('customerId', 'firstName lastName')
          .populate('barberId', 'firstName lastName')
          .populate('serviceId', 'name price duration')
          .populate('shopId', 'name address')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Booking.countDocuments(query)
      ]);

      return {
        bookings,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error(`Get all shop bookings error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a new shop owner (user + profile) - for admin use
   * @param {Object} shopOwnerData - Shop owner data including user info
   * @returns {Promise<Object>} - Created shop owner with user data
   */
  async createShopOwner(shopOwnerData) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check if email already exists
      const existingUser = await User.findOne({ email: shopOwnerData.email });
      if (existingUser) {
        throw new Error('Email already exists');
      }

      // Check if shop exists and if it already has an owner (only if shopId is provided)
      let shop = null;
      if (shopOwnerData.shopId) {
        shop = await Shop.findById(shopOwnerData.shopId);
        if (!shop) {
          throw new Error('Shop not found');
        }
        if (shop.ownerId) {
          throw new Error('Shop already has an owner');
        }
      }

      // Create user first
      const user = new User({
        email: shopOwnerData.email,
        password: shopOwnerData.password,
        firstName: shopOwnerData.firstName,
        lastName: shopOwnerData.lastName,
        phoneNumber: shopOwnerData.phoneNumber,
        address: shopOwnerData.address,
        city: shopOwnerData.city,
        zipCode: shopOwnerData.zipCode,
        role: ROLES.SHOP_OWNER,
        countryId: shopOwnerData.countryId,
        isActive: shopOwnerData.isActive !== undefined ? shopOwnerData.isActive : true,
        emailVerified: shopOwnerData.emailVerified !== undefined ? shopOwnerData.emailVerified : true,
        status: 'active'
      });

      await user.save({ session });

      // Upload files if they exist
      let businessLogoUrl = null;
      let businessRegistrationDocUrl = null;

      if (shopOwnerData.businessLogoBlob) {
        businessLogoUrl = await fileUploadService.uploadFile(
          shopOwnerData.businessLogoBlob.buffer,
          shopOwnerData.businessLogoBlob.originalname,
          'shop-owner-business-logo'
        );
      }

      if (shopOwnerData.businessRegistrationDocBlob) {
        businessRegistrationDocUrl = await fileUploadService.uploadFile(
          shopOwnerData.businessRegistrationDocBlob.buffer,
          shopOwnerData.businessRegistrationDocBlob.originalname,
          'shop-owner-documents'
        );
      }

      // Create shop owner profile with all required fields
      const shopOwner = new ShopOwner({
        userId: user._id,
        // User fields (required by current model design)
        email: shopOwnerData.email,
        password: shopOwnerData.password,
        firstName: shopOwnerData.firstName,
        lastName: shopOwnerData.lastName,
        role: ROLES.SHOP_OWNER,
        countryId: shopOwnerData.countryId,
        isActive: true,
        status: 'active',
        emailVerified: true,
        // Business fields
        businessName: shopOwnerData.businessName,
        businessAddress: shopOwnerData.businessAddress,
        businessPhone: shopOwnerData.businessPhone,
        businessEmail: shopOwnerData.businessEmail,
        businessLogo: businessLogoUrl,
        businessLogoBlob: shopOwnerData.businessLogoBlob || null,
        businessRegistrationDoc: businessRegistrationDocUrl,
        businessRegistrationDocBlob: shopOwnerData.businessRegistrationDocBlob || null,
        taxId: shopOwnerData.taxId,
        businessRegistrationNumber: shopOwnerData.businessRegistrationNumber,
        stripeAccountId: shopOwnerData.stripeAccountId || null,
        verificationStatus: shopOwnerData.verificationStatus || 'verified',
        verificationDocuments: shopOwnerData.verificationDocuments || [],
        operatingCountries: shopOwnerData.operatingCountries || []
      });

      await shopOwner.save({ session });

      // Assign shop owner to the shop (only if shopId was provided)
      if (shop) {
        shop.ownerId = shopOwner._id;
        await shop.save({ session });
      }

      await session.commitTransaction();

      // Return shop owner with populated user data
      return await ShopOwner.findById(shopOwner._id)
        .populate('userId', '-password -emailVerificationToken -emailVerificationExpiry -resetPasswordToken -resetPasswordExpiry');

    } catch (error) {
      await session.abortTransaction();
      logger.error(`Create shop owner error: ${error.message}`);
      throw error;
    } finally {
      session.endSession();
    }
  }
}

module.exports = new ShopOwnerService();