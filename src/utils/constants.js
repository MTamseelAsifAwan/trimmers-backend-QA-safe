/**
 * Regular expressions for validation
 */
const REGEX = {
    EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    PHONE: /^(?:(?:\+92)(?:3[0-9]{9})|(?:\+49)(?:1(?:5|6|7)[0-9]{8,9})|(?:03[0-9]{9})|(?:01(?:5|6|7)[0-9]{8,9}))$/,
    UID: /^[a-zA-Z0-9]{8,12}$/
};
/**
 * User roles constants
 */
const ROLES = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    CUSTOMER_CARE: 'customer_care',
    COUNTRY_MANAGER: 'country_manager',
    SHOP_OWNER: 'shop_owner',
    BARBER: 'barber',
    CUSTOMER: 'customer',
    FREELANCER: 'freelancer'
};

/**
 * User status constants
 */
const USER_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
    PENDING_VERIFICATION: 'pending_verification'
};

/**
 * Barber status constants
 */
const BARBER_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    ON_LEAVE: 'on_leave'
};

/**
 * Shop status constants
 */
const SHOP_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING_VERIFICATION: 'pending_verification',
    REJECTED: 'rejected'
};

/**
 * Booking status constants
 */
const BOOKING_STATUS = {
    PENDING: 'pending',
    PENDING_APPROVAL: 'pending_approval',
    ASSIGNED: 'assigned',
    CONFIRMED: 'confirmed',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    NO_SHOW: 'noShow',
    REJECTED: 'rejected',
    REASSIGNED: 'reassigned'
};

/**
 * Service types
 */
const SERVICE_TYPES = {
    SHOP_BASED: 'shopBased',
    HOME_BASED: 'homeBased'
};

/**
 * Service status constants
 */
const SERVICE_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending',
    REJECTED: 'rejected'
};

/**
 * Payment status constants
 */
const PAYMENT_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded',
    CANCELLED: 'cancelled'
};

/**
 * Barber employment types
 */
const EMPLOYMENT_TYPES = {
    FREELANCE: 'freelance',
    EMPLOYED: 'employed'
};

/**
 * Days of week
 */
const DAYS_OF_WEEK = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
];


module.exports = {
    ROLES,
    USER_STATUS,
    BARBER_STATUS,
    SHOP_STATUS,
    BOOKING_STATUS,
    SERVICE_TYPES,
    SERVICE_STATUS,
    PAYMENT_STATUS,
    EMPLOYMENT_TYPES,
    DAYS_OF_WEEK,
    REGEX
};