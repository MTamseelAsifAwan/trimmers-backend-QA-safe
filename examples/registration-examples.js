// Example Barber registration request
const barberRegistration = {
	email: "barber@test.com",
	password: "Password123!",
	firstName: "John",
	lastName: "Barber",
	role: "barber",
	serviceType: "homeBased",
	phoneNumber: "1234567890",
	countryId: "68bd2258c8c787159e5b538f",  // Required - Country ID from Country collection
	profile: {
		location: {
			latitude: 37.7749,
			longitude: -122.4194,
			formattedAddress: "123 Main St, City, Country"
		}
	},
	schedule: {
		monday: { from: "09:00", to: "17:00", status: "available" },
		tuesday: { from: "09:00", to: "17:00", status: "available" },
		wednesday: { from: "09:00", to: "17:00", status: "available" },
		thursday: { from: "09:00", to: "17:00", status: "available" },
		friday: { from: "09:00", to: "17:00", status: "available" },
		saturday: { from: "09:00", to: "17:00", status: "available" },
		sunday: { from: "", to: "", status: "unavailable" }
	},
	services: ["68bd1f9609aebd1b829ba2b4", "68bd1f9609aebd1b829ba2b5"]
};

// Example Freelancer registration request
const freelancerRegistration = {
	email: "freelancer@test.com",
	password: "Password123!",
	firstName: "Jane",
	lastName: "Doe",
	role: "freelancer",
	serviceType: "homeBased",
	phoneNumber: "9876543210",
	countryId: "68bd2258c8c787159e5b538f",  // Required - Country ID from Country collection
	profile: {
		location: {
			latitude: 37.7749,
			longitude: -122.4194,
			formattedAddress: "123 Main St, City, Country"
		}
	},
	schedule: {
		monday: { from: "10:00", to: "18:00", status: "available" },
		tuesday: { from: "10:00", to: "18:00", status: "available" },
		wednesday: { from: "10:00", to: "18:00", status: "available" },
		thursday: { from: "10:00", to: "18:00", status: "available" },
		friday: { from: "10:00", to: "18:00", status: "available" },
		saturday: { from: "10:00", to: "18:00", status: "available" },
		sunday: { from: "", to: "", status: "unavailable" }
	},
	services: ["68bd1f9609aebd1b829ba2b6", "68bd1f9609aebd1b829ba2b7"]
};

// Example Customer registration request
const customerRegistration = {
  email: "customer@example.com",
  password: "Password123!",
  firstName: "John",
  lastName: "Doe",
  phoneNumber: "1234567890",
  role: "customer",
  countryId: "68bd2258c8c787159e5b538f"  // Required - Country ID from Country collection
};
// Example shopowner registration request
const shopOwnerRegistration = {
  email: "shopowner@test.com",
  password: "Password123!",
  firstName: "John",
  lastName: "Smith",
  phoneNumber: "+1234567890",
  role: "shop_owner",
  businessName: "Premium Cuts Salon",
  businessAddress: "123 Business St, City, State 12345",
  businessPhone: "+1234567890",
  businessEmail: "contact@premiumcuts.com",
  taxId: "123456789",
  businessRegistrationNumber: "REG123456789",
  countryId: "68bd2258c8c787159e5b538f"  // Required - Country ID from Country collection
};

// Example shop creation request (after shop owner registration)
const shopCreation = {
  name: "Premium Cuts Salon",
  description: "Professional barber services with modern techniques",
  images: ["https://example.com/shop/image1.jpg"],
  logo: "https://example.com/shop/logo.jpg",
  location: {
    address: "123 Business St, City, State 12345",
    latitude: 40.7128,
    longitude: -74.0060,
    formattedAddress: "123 Business St, City, State 12345",
    city: "City",
    state: "State",
    country: "Country",
    postalCode: "12345"
  },
  contactPhone: "+1234567890",
  contactEmail: "contact@premiumcuts.com",
  businessHours: [
    {
      day: 1,
      openTime: { hour: 9, minute: 0 },
      closeTime: { hour: 18, minute: 0 },
      isClosed: false
    },
    {
      day: 2,
      openTime: { hour: 9, minute: 0 },
      closeTime: { hour: 18, minute: 0 },
      isClosed: false
    },
    {
      day: 3,
      openTime: { hour: 9, minute: 0 },
      closeTime: { hour: 18, minute: 0 },
      isClosed: false
    },
    {
      day: 4,
      openTime: { hour: 9, minute: 0 },
      closeTime: { hour: 18, minute: 0 },
      isClosed: false
    },
    {
      day: 5,
      openTime: { hour: 9, minute: 0 },
      closeTime: { hour: 18, minute: 0 },
      isClosed: false
    },
    {
      day: 6,
      openTime: { hour: 10, minute: 0 },
      closeTime: { hour: 16, minute: 0 },
      isClosed: false
    },
    {
      day: 0,
      openTime: { hour: 0, minute: 0 },
      closeTime: { hour: 0, minute: 0 },
      isClosed: true
    }
  ],
  serviceTypes: ["shopBased"],
  services: ["68bd1f9609aebd1b829ba2b4", "68bd1f9609aebd1b829ba2b5", "68bd1f9609aebd1b829ba2b6"],
  amenities: ["wifi", "coffee", "tv"],
  socialLinks: {
    website: "https://premiumcuts.com",
    instagram: "https://instagram.com/premiumcuts",
    facebook: "https://facebook.com/premiumcuts"
  }
};