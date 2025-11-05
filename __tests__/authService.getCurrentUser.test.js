const mongoose = require('mongoose');

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

const createQueryMock = (resolvedValue) => ({
  select: jest.fn().mockReturnThis(),
  populate: jest.fn().mockResolvedValue(resolvedValue)
});

jest.mock('../src/models/Barber', () => ({
  findById: jest.fn(() => createQueryMock(null))
}));

jest.mock('../src/models/Freelancer', () => ({
  findById: jest.fn(() => createQueryMock(null))
}));

jest.mock('../src/models/ShopOwner', () => ({
  findById: jest.fn(() => createQueryMock(null))
}));

jest.mock('../src/models/Admin', () => ({
  findById: jest.fn(() => createQueryMock(null))
}));

const mockCustomerQuery = createQueryMock(null);

jest.mock('../src/models/Customer', () => ({
  findById: jest.fn(() => mockCustomerQuery)
}));

const mockCountry = {
  _id: new mongoose.Types.ObjectId().toString(),
  name: 'Pakistan',
  code: 'PK',
  flagUrl: 'https://flags.example/pk.svg'
};

const mockCountryQuery = {
  select: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(mockCountry)
};

const mockCountryFindById = jest.fn(() => mockCountryQuery);

jest.mock('../src/models/Country', () => ({
  findById: (...args) => mockCountryFindById(...args)
}));

jest.mock('../src/models/Role', () => ({
  findById: jest.fn()
}));

const authService = require('../src/services/authService');
const Customer = require('../src/models/Customer');

describe('authService.getCurrentUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCountryQuery.lean.mockResolvedValue(mockCountry);
  });

  it('returns enriched profile with country details when customer has country reference', async () => {
  const customerId = new mongoose.Types.ObjectId().toString();
  const countryId = new mongoose.Types.ObjectId().toString();

    const mockCustomer = {
      _id: customerId,
      uid: 'CU123',
      email: 'customer@example.com',
      firstName: 'Nasir',
      lastName: 'Hussain',
      role: 'customer',
      profileImage: null,
      isActive: true,
      emailVerified: true,
      profile: {
        address: countryId,
        phoneNumber: '03423121141'
      },
      addresses: [
        {
          latitude: 33.6844,
          longitude: 73.0479,
          formattedAddress: 'Islamabad, Pakistan'
        }
      ]
    };

    mockCustomerQuery.populate.mockResolvedValueOnce(mockCustomer);

    const result = await authService.getCurrentUser(customerId);

    expect(Customer.findById).toHaveBeenCalledWith(customerId);
  expect(mockCountryFindById).toHaveBeenCalledWith(countryId);

    expect(result.user.profile).toMatchObject({
      countryId: countryId,
      countryName: 'Pakistan',
      countryCode: 'PK',
      phoneNumber: '03423121141',
      latitude: 33.6844,
      longitude: 73.0479,
      location: {
        latitude: 33.6844,
        longitude: 73.0479,
        formattedAddress: 'Islamabad, Pakistan'
      }
    });
  });
});
