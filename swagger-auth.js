const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Authentication API',
      version: '1.0.0',
      description: 'API for user authentication and profile management'
    },
    servers: [
      {
        url: 'https://dev-api.trimmers.shop',
        description: 'Production Server'
      },
      {
        url: 'http://localhost:5000',
        description: 'Local Development Server'
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Schedule: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              example: '09:00'
            },
            to: {
              type: 'string',
              example: '18:00'
            },
            status: {
              type: 'string',
              enum: ['available', 'unavailable'],
              example: 'available'
            }
          }
        },
        WeeklySchedule: {
          type: 'object',
          properties: {
            monday: { $ref: '#/components/schemas/Schedule' },
            tuesday: { $ref: '#/components/schemas/Schedule' },
            wednesday: { $ref: '#/components/schemas/Schedule' },
            thursday: { $ref: '#/components/schemas/Schedule' },
            friday: { $ref: '#/components/schemas/Schedule' },
            saturday: { $ref: '#/components/schemas/Schedule' },
            sunday: { $ref: '#/components/schemas/Schedule' }
          }
        },
        Location: {
          type: 'object',
          properties: {
            latitude: {
              type: 'number',
              example: 33
            },
            longitude: {
              type: 'number',
              example: 73
            },
            formattedAddress: {
              type: 'string',
              example: '123 Main St, City, Country'
            }
          }
        },
        Profile: {
          type: 'object',
          properties: {
            location: {
              $ref: '#/components/schemas/Location'
            },
            phoneNumber: {
              type: 'string',
              example: '9876543210'
            }
          }
        },
        CurrentUser: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '68c3cde6fcd2ba2fd7d2b85b'
            },
            uid: {
              type: 'string',
              example: 'FRKS86798641'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'freelancer@test.com'
            },
            firstName: {
              type: 'string',
              example: 'hamza'
            },
            lastName: {
              type: 'string',
              example: 'Adeel'
            },
            role: {
              type: 'string',
              example: 'freelancer'
            },
            profileImage: {
              type: 'string',
              nullable: true,
              example: null
            },
            isActive: {
              type: 'boolean',
              example: true
            },
            emailVerified: {
              type: 'boolean',
              example: true
            },
            profile: {
              $ref: '#/components/schemas/Profile'
            },
            schedule: {
              $ref: '#/components/schemas/WeeklySchedule'
            }
          }
        },
        CurrentUserResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/CurrentUser'
                },
                role: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      example: 'freelancer'
                    }
                  }
                }
              }
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '68bd4456c1859c1aa8de201a'
            },
            uid: {
              type: 'string',
              example: 'CUUD63210442'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'customer@example.com'
            },
            firstName: {
              type: 'string',
              example: 'John'
            },
            lastName: {
              type: 'string',
              example: 'Doe'
            },
            role: {
              type: 'string',
              example: 'customer'
            },
            isActive: {
              type: 'boolean',
              example: true
            },
            emailVerified: {
              type: 'boolean',
              example: true
            }
          }
        },
        ScheduleDay: {
          type: 'object',
          properties: {
            day: {
              type: 'string',
              example: 'monday'
            },
            from: {
              type: 'string',
              example: '10:00'
            },
            to: {
              type: 'string',
              example: '18:00'
            },
            status: {
              type: 'string',
              example: 'available'
            }
          },
          required: ['status']
        },
        CustomerProfile: {
          type: 'object',
          properties: {
            roleId: {
              type: 'string',
              nullable: true
            },
            _id: {
              type: 'string',
              example: '68bd4456c1859c1aa8de201a'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'customer@example.com'
            },
            firstName: {
              type: 'string',
              example: 'John'
            },
            lastName: {
              type: 'string',
              example: 'Doe'
            },
            role: {
              type: 'string',
              example: 'customer'
            },
            phoneNumber: {
              type: 'string',
              example: '1234567890'
            },
            isActive: {
              type: 'boolean',
              example: true
            },
            emailVerified: {
              type: 'boolean',
              example: true
            },
            emailVerified: {
              type: 'boolean',
              example: true
            },
            resetPasswordOTPVerified: {
              type: 'boolean',
              example: false
            },
            addresses: {
              type: 'array',
              items: {
                type: 'object'
              },
              example: []
            },
            defaultAddress: {
              type: 'integer',
              example: 0
            },
            favoriteShops: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: []
            },
            favoriteBarbers: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: []
            },
            stripeCustomerId: {
              type: 'string',
              nullable: true
            },
            uid: {
              type: 'string',
              example: 'CUUD63210442'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-09-07T08:37:42.312Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-09-09T04:50:34.739Z'
            },
            __v: {
              type: 'integer',
              example: 1
            },
            emailOTP: {
              type: 'string',
              example: '1234'
            },
            permissions: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: []
            },
            status: {
              type: 'string',
              example: 'active'
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
              example: '2025-09-09T04:50:34.730Z'
            },
            countryId: {
              type: 'string',
              example: '68bd2258c8c787159e5b538f'
            }
          }
        },
        ProfileScheduleEntry: {
          type: 'object',
          description: 'Schedule entry used by barber and freelancer profiles.',
          properties: {
            day: {
              type: 'string',
              example: 'monday',
              description: 'Lowercase day of the week.'
            },
            from: {
              type: 'string',
              example: '09:00'
            },
            to: {
              type: 'string',
              example: '18:00'
            },
            status: {
              type: 'string',
              example: 'available'
            }
          },
          required: ['day', 'status']
        },
        CommonProfileData: {
          type: 'object',
          description: 'Fields shared across all profile responses.',
          properties: {
            id: { type: 'string', nullable: true },
            uid: { type: 'string', nullable: true },
            role: { type: 'string', nullable: true, example: 'barber' },
            email: { type: 'string', format: 'email', nullable: true },
            firstName: { type: 'string', nullable: true },
            lastName: { type: 'string', nullable: true },
            displayName: { type: 'string', nullable: true },
            phoneNumber: { type: 'string', nullable: true },
            address: { type: 'string', nullable: true },
            city: { type: 'string', nullable: true },
            zipCode: { type: 'string', nullable: true },
            countryId: { type: 'string', nullable: true },
            status: { type: 'string', nullable: true },
            verificationStatus: { type: 'string', nullable: true },
            profileImage: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time', nullable: true },
            updatedAt: { type: 'string', format: 'date-time', nullable: true }
          }
        },
        CustomerRoleData: {
          type: 'object',
          properties: {
            displayName: { type: 'string', nullable: true },
            addresses: { type: 'array', items: { type: 'object' } },
            defaultAddress: { type: 'integer', nullable: true },
            favoriteShops: { type: 'array', items: { type: 'string' } },
            favoriteBarbers: { type: 'array', items: { type: 'string' } },
            stripeCustomerId: { type: 'string', nullable: true },
            areaId: { type: 'string', nullable: true }
          }
        },
        BarberRoleData: {
          type: 'object',
          properties: {
            serviceType: { type: 'string', nullable: true },
            status: { type: 'string', nullable: true },
            verificationStatus: { type: 'string', nullable: true },
            rating: { type: 'number', format: 'float', nullable: true },
            reviewCount: { type: 'integer', nullable: true },
            joinedDate: { type: 'string', format: 'date-time', nullable: true },
            schedule: {
              type: 'array',
              items: { $ref: '#/components/schemas/ProfileScheduleEntry' }
            },
            services: { type: 'array', items: { type: 'object' } },
            shop: { type: 'object', nullable: true },
            shopId: { type: 'string', nullable: true }
          }
        },
        FreelancerRoleData: {
          type: 'object',
          properties: {
            serviceType: { type: 'string', nullable: true },
            status: { type: 'string', nullable: true },
            verificationStatus: { type: 'string', nullable: true },
            services: { type: 'array', items: { type: 'object' } },
            schedule: {
              type: 'array',
              items: { $ref: '#/components/schemas/ProfileScheduleEntry' }
            },
            addresses: { type: 'array', items: { type: 'object' } },
            profileDetails: { type: 'object', nullable: true }
          }
        },
        ShopOwnerRoleData: {
          type: 'object',
          properties: {
            businessName: { type: 'string', nullable: true },
            businessAddress: { type: 'string', nullable: true },
            businessPhone: { type: 'string', nullable: true },
            businessEmail: { type: 'string', format: 'email', nullable: true },
            taxId: { type: 'string', nullable: true },
            businessRegistrationNumber: { type: 'string', nullable: true },
            stripeAccountId: { type: 'string', nullable: true },
            verificationDocuments: {
              type: 'array',
              items: { type: 'object' }
            },
            shops: {
              type: 'array',
              items: { type: 'object' }
            }
          }
        },
        ProfileRoleData: {
          description: 'Role-specific fields returned with a profile.',
          oneOf: [
            { $ref: '#/components/schemas/CustomerRoleData' },
            { $ref: '#/components/schemas/BarberRoleData' },
            { $ref: '#/components/schemas/FreelancerRoleData' },
            { $ref: '#/components/schemas/ShopOwnerRoleData' },
            { type: 'object', description: 'Empty object when no role data is available.' }
          ]
        },
        UnifiedProfileData: {
          allOf: [
            { $ref: '#/components/schemas/CommonProfileData' },
            {
              type: 'object',
              properties: {
                roleData: {
                  $ref: '#/components/schemas/ProfileRoleData'
                },
                permissions: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['profile:read', 'profile:update']
                }
              }
            }
          ]
        },
        ProfileResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { $ref: '#/components/schemas/UnifiedProfileData' },
            profileType: { type: 'string', example: 'barber' }
          }
        },
        ProfileUpdateRequest: {
          type: 'object',
          description: 'Payload for updating a profile. All fields are optional and depend on the authenticated user role.',
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phoneNumber: { type: 'string' },
            profileImage: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            zipCode: { type: 'string' },
            countryId: { type: 'string' },
            serviceType: { type: 'string' },
            specialization: { type: 'string' },
            employmentType: { type: 'string' },
            bio: { type: 'string' },
            displayName: { type: 'string' },
            location: {
              type: 'object',
              properties: {
                latitude: { type: 'number' },
                longitude: { type: 'number' },
                formattedAddress: { type: 'string' }
              }
            },
            servicingArea: {
              type: 'array',
              items: { type: 'string' }
            },
            schedule: {
              description: 'Barber and freelancer schedules can be provided as an array or an object keyed by weekday.',
              oneOf: [
                {
                  type: 'array',
                  items: { $ref: '#/components/schemas/ProfileScheduleEntry' }
                },
                {
                  type: 'object',
                  additionalProperties: { $ref: '#/components/schemas/ScheduleDay' },
                  example: {
                    monday: { from: '09:00', to: '17:00', status: 'available' }
                  }
                }
              ]
            },
            status: { type: 'string' },
            nationalId: { type: 'string' },
            portfolio: {
              type: 'array',
              items: { type: 'string' }
            },
            shopId: { type: 'string' },
            services: {
              type: 'array',
              items: { type: 'string' }
            },
            country: { type: 'string' },
            stripeCustomerId: { type: 'string' },
            businessName: { type: 'string' },
            businessAddress: { type: 'string' },
            businessPhone: { type: 'string' },
            businessEmail: { type: 'string' },
            businessLogo: { type: 'string' },
            taxId: { type: 'string' },
            businessRegistrationNumber: { type: 'string' },
            stripeAccountId: { type: 'string' },
            verificationDocuments: {
              type: 'array',
              items: { type: 'string' }
            },
            profile: {
              type: 'object',
              description: 'Nested profile updates for customers (e.g. phoneNumber, address).',
              additionalProperties: true
            }
          }
        },
        ProfileUpdateResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            statusCode: { type: 'integer', example: 200 },
            message: { type: 'string', example: 'Profile updated successfully' }
          }
        }
      }
    },
    paths: {
      '/api/auth/register': {
        post: {
          summary: 'Register a new user (barber or freelancer)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'firstName', 'lastName', 'role'],
                  properties: {
                    email: {
                      type: 'string',
                      format: 'email',
                      example: 'freelancer-2203@example.com'
                    },
                    password: {
                      type: 'string',
                      example: 'Password123!'
                    },
                    firstName: {
                      type: 'string',
                      example: 'Jane'
                    },
                    lastName: {
                      type: 'string',
                      example: 'Doe'
                    },
                    role: {
                      type: 'string',
                      enum: ['customer', 'barber', 'shop_owner', 'freelancer'],
                      example: 'freelancer'
                    },
                    serviceType: {
                      type: 'string',
                      example: 'homeBased'
                    },
                    phoneNumber: {
                      type: 'string',
                      example: '9876543210'
                    },
                    profile: {
                      type: 'object',
                      required: ['location'],
                      properties: {
                        location: {
                          type: 'object',
                          required: ['latitude', 'longitude', 'formattedAddress'],
                          properties: {
                            latitude: {
                              type: 'number',
                              example: 37.7749
                            },
                            longitude: {
                              type: 'number',
                              example: -122.4194
                            },
                            formattedAddress: {
                              type: 'string',
                              example: '123 Main St, City, Country'
                            }
                          }
                        }
                      }
                    },
                    services: {
                      type: 'array',
                      items: {
                        type: 'string'
                      },
                      example: ['68bd1f9609aebd1b829ba2b6', '68bd1f9609aebd1b829ba2b7']
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Successful registration',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean',
                        example: true
                      },
                      message: {
                        type: 'string',
                        example: 'Registration successful'
                      },
                      data: {
                        type: 'object',
                        properties: {
                          user: {
                            $ref: '#/components/schemas/User'
                          },
                          token: {
                            type: 'string',
                            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/profile': {
        get: {
          summary: 'Get authenticated profile',
          description: 'Returns unified profile data for the authenticated user regardless of role.',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Profile retrieved successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ProfileResponse' }
                }
              }
            },
            '401': {
              description: 'Unauthorized'
            },
            '403': {
              description: 'Forbidden'
            }
          }
        },
        put: {
          summary: 'Update authenticated profile',
          description: 'Updates profile information for the authenticated user. All fields are optional and validated based on role.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProfileUpdateRequest' },
                example: {
                  firstName: 'John',
                  lastName: 'Doe',
                  schedule: [
                    { day: 'monday', from: '09:00', to: '17:00', status: 'available' }
                  ]
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Profile updated successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ProfileUpdateResponse' }
                }
              }
            },
            '400': {
              description: 'Validation error'
            },
            '401': {
              description: 'Unauthorized'
            },
            '403': {
              description: 'Forbidden'
            }
          }
        }
      },
        '/api/bookings/shop-available-slots': {
          get: {
            summary: 'Get slots for shop',
            description: 'Returns available booking slots for a shop on a specific date and service.',
            parameters: [
              {
                name: 'shopId',
                in: 'query',
                required: true,
                schema: {
                  type: 'string',
                  example: '68be83c37461fe135c3ea28e'
                },
                description: 'Shop ID'
              },
              {
                name: 'date',
                in: 'query',
                required: true,
                schema: {
                  type: 'string',
                  format: 'date',
                  example: '2025-09-12'
                },
                description: 'Date (YYYY-MM-DD)'
              },
              {
                name: 'serviceId',
                in: 'query',
                required: true,
                schema: {
                  type: 'string',
                  example: '68bd1f9609aebd1b829ba2b4'
                },
                description: 'Service ID'
              }
            ],
            responses: {
              '200': {
                description: 'Available slots for shop',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean', example: true },
                        data: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              hour: { type: 'integer', example: 9 },
                              minute: { type: 'integer', example: 0 }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '/api/services/{serviceId}/providers': {
          get: {
            summary: 'Get all service providers for a service',
            description: 'Returns all providers for a given service ID, filtered by latitude and longitude.',
            parameters: [
              {
                name: 'serviceId',
                in: 'path',
                required: true,
                '/api/services/nearby/services': {
                  type: 'string',
                  example: '68bd1f9609aebd1b829ba2b4'
                },
                description: 'Service ID'
              },
              {
                name: 'lat',
                in: 'query',
                required: true,
                schema: {
                  type: 'number',
                  example: 33
                },
                description: 'Latitude'
              },
              {
                name: 'long',
                in: 'query',
                required: true,
                schema: {
                  type: 'number',
                  example: 73
                },
                description: 'Longitude'
              }
            ],
            responses: {
              '200': {
                description: 'List of service providers',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean', example: true },
                        count: { type: 'integer', example: 3 },
                        providers: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              provider: {
                                type: 'object',
                                properties: {
                                  id: { type: 'string', example: '68be83c37461fe135c3ea28e' },
                                  uid: { type: 'string', example: 'SHHD25505091' },
                                  type: { type: 'string', example: 'shop' },
                                  name: { type: 'string', example: 'Premium Cuts Salon' },
                                  email: { type: 'string', example: '' },
                                  phone: { type: 'string', example: '+1234567890' },
                                  address: { type: 'string', example: '123 Business St, City, State 12345' },
                                  rating: { type: 'number', example: 0 },
                                  reviewCount: { type: 'integer', example: 0 },
                                  description: { type: 'string', example: '' },
                                  images: { type: 'array', items: { type: 'string' }, example: [] },
                                  mainImage: { type: 'string', nullable: true, example: null },
                                  serviceType: { type: 'string', example: 'shopBased' },
                                  location: {
                                    type: 'object',
                                    properties: {
                                      latitude: { type: 'number', example: 33 },
                                      longitude: { type: 'number', example: 73 }
                                    }
                                  },
                                  shopOwner: {
                                    type: 'object',
                                    properties: {
                                      id: { type: 'string', example: '68bd453719c2ac93dd4cb0c4' },
                                      email: { type: 'string', example: 'shopowner@test.com' },
                                      firstName: { type: 'string', example: 'Imran' },
                                      lastName: { type: 'string', example: 'Majeed' },
                                      fullName: { type: 'string', example: 'Imran Majeed' }
                                    }
                                  },
                                  barbers: {
                                    type: 'array',
                                    items: {
                                      type: 'object',
                                      properties: {
                                        id: { type: 'string', example: '68c5a27cae791a81ecd95c97' },
                                        uid: { type: 'string', example: 'BACB65271747' },
                                        firstName: { type: 'string', example: 'sammar' },
                                        lastName: { type: 'string', example: 'Sajid' },
                                        fullName: { type: 'string', example: 'sammar Sajid' },
                                        phone: { type: 'string', example: '9876543220' },
                                        status: { type: 'string', example: 'active' },
                                        serviceType: { type: 'string', example: 'shopBased' },
                                        rating: { type: 'number', example: 0 },
                                        reviewCount: { type: 'integer', example: 0 },
                                        availableSlots: {
                                          type: 'object',
                                          additionalProperties: {
                                            type: 'array',
                                            items: { type: 'string' },
                                            example: ["10:00", "10:30", "11:00"]
                                          }
                                        }
                                      }
                                    }
                                  },
                                  availableSlots: {
                                    type: 'object',
                                    additionalProperties: {
                                      type: 'array',
                                      items: { type: 'string' },
                                      example: ["09:00", "09:30", "10:00"]
                                    }
                                  },
                                  userId: { type: 'string', nullable: true, example: null },
                                  status: { type: 'string', example: 'active' },
                                  shopId: { type: 'string', nullable: true, example: null },
                                  user: {
                                    type: 'object',
                                    properties: {
                                      firstName: { type: 'string', example: 'hamza' },
                                      lastName: { type: 'string', example: 'Ali' },
                                      fullName: { type: 'string', example: 'hamza Ali' },
                                      phone: { type: 'string', example: '9876543210' }
                                    }
                                  }
                                }
                              },
                              service: {
                                type: 'object',
                                properties: {
                                  id: { type: 'string', example: '68bd1f9609aebd1b829ba2b5' },
                                  customPrice: { type: 'number', example: 500 },
                                  customDuration: { type: 'integer', example: 30 }
                                }
                              },
                              distance: { type: 'number', example: 0 }
                            }
                          }
                        }
                      }
                    },
                    example: {
                      "success": true,
                      "count": 3,
                      "providers": [
                        {
                          "provider": {
                            "id": "68be83c37461fe135c3ea28e",
                            "uid": "SHHD25505091",
                            "type": "shop",
                            "name": "Premium Cuts Salon",
                            "email": "",
                            "phone": "+1234567890",
                            "address": "123 Business St, City, State 12345",
                            "rating": 0,
                            "reviewCount": 0,
                            "description": "",
                            "images": [],
                            "mainImage": null,
                            "serviceType": "shopBased",
                            "location": {
                              "latitude": 33,
                              "longitude": 73
                            },
                            "shopOwner": {
                              "id": "68bd453719c2ac93dd4cb0c4",
                              "email": "shopowner@test.com",
                              "firstName": "Imran",
                              "lastName": "Majeed",
                              "fullName": "Imran Majeed"
                            },
                            "barbers": [
                              {
                                "id": "68c5a27cae791a81ecd95c97",
                                "uid": "BACB65271747",
                                "firstName": "sammar",
                                "lastName": "Sajid",
                                "fullName": "sammar Sajid",
                                "phone": "9876543220",
                                "status": "active",
                                "serviceType": "shopBased",
                                "rating": 0,
                                "reviewCount": 0,
                                "availableSlots": {
                                  "2025-09-16": [
                                    "10:00",
                                    "10:30",
                                    "11:00",
                                    "11:30",
                                    "12:00",
                                    "12:30",
                                    "13:00",
                                    "13:30",
                                    "14:00",
                                    "14:30",
                                    "15:00",
                                    "15:30",
                                    "16:00",
                                    "16:30",
                                    "17:00",
                                    "17:30"
                                  ],
                                  "2025-09-17": [
                                    "10:00",
                                    "10:30",
                                    "11:00",
                                    "11:30",
                                    "12:00",
                                    "12:30",
                                    "13:00",
                                    "13:30",
                                    "14:00",
                                    "14:30",
                                    "15:00",
                                    "15:30",
                                    "16:00",
                                    "16:30",
                                    "17:00",
                                    "17:30"
                                  ],
                                  "2025-09-18": [
                                    "10:00",
                                    "10:30",
                                    "11:00",
                                    "11:30",
                                    "12:00",
                                    "12:30",
                                    "13:00",
                                    "13:30",
                                    "14:00",
                                    "14:30",
                                    "15:00",
                                    "15:30",
                                    "16:00",
                                    "16:30",
                                    "17:00",
                                    "17:30"
                                  ],
                                  "2025-09-19": [
                                    "10:00",
                                    "10:30",
                                    "11:00",
                                    "11:30",
                                    "12:00",
                                    "12:30",
                                    "13:00",
                                    "13:30",
                                    "14:00",
                                    "14:30",
                                    "15:00",
                                    "15:30",
                                    "16:00",
                                    "16:30",
                                    "17:00",
                                    "17:30"
                                  ],
                                  "2025-09-20": [
                                    "10:00",
                                    "10:30",
                                    "11:00",
                                    "11:30",
                                    "12:00",
                                    "12:30",
                                    "13:00",
                                    "13:30",
                                    "14:00",
                                    "14:30",
                                    "15:00",
                                    "15:30",
                                    "16:00",
                                    "16:30",
                                    "17:00",
                                    "17:30"
                                  ],
                                  "2025-09-21": [],
                                  "2025-09-22": [
                                    "09:00",
                                    "09:30",
                                    "10:00",
                                    "10:30",
                                    "11:00",
                                    "11:30",
                                    "12:00",
                                    "12:30",
                                    "13:00",
                                    "13:30",
                                    "14:00",
                                    "14:30",
                                    "15:00",
                                    "15:30",
                                    "16:00",
                                    "16:30"
                                  ]
                                }
                              }
                            ],
                            "availableSlots": {
                              "2025-09-16": [
                                "09:00",
                                "09:30",
                                "10:00",
                                "10:30",
                                "11:00",
                                "11:30",
                                "12:00",
                                "12:30",
                                "13:00",
                                "13:30",
                                "14:00",
                                "14:30",
                                "15:00",
                                "15:30",
                                "16:00",
                                "16:30",
                                "17:00",
                                "17:30"
                              ],
                              "2025-09-17": [
                                "09:00",
                                "09:30",
                                "10:00",
                                "10:30",
                                "11:00",
                                "11:30",
                                "12:00",
                                "12:30",
                                "13:00",
                                "13:30",
                                "14:00",
                                "14:30",
                                "15:00",
                                "15:30",
                                "16:00",
                                "16:30",
                                "17:00",
                                "17:30"
                              ],
                              "2025-09-18": [
                                "09:00",
                                "09:30",
                                "10:00",
                                "10:30",
                                "11:00",
                                "11:30",
                                "12:00",
                                "12:30",
                                "13:00",
                                "13:30",
                                "14:00",
                                "14:30",
                                "15:00",
                                "15:30",
                                "16:00",
                                "16:30",
                                "17:00",
                                "17:30"
                              ],
                              "2025-09-19": [
                                "09:00",
                                "09:30",
                                "10:00",
                                "10:30",
                                "11:00",
                                "11:30",
                                "12:00",
                                "12:30",
                                "13:00",
                                "13:30",
                                "14:00",
                                "14:30",
                                "15:00",
                                "15:30",
                                "16:00",
                                "16:30",
                                "17:00",
                                "17:30"
                              ],
                              "2025-09-20": [
                                "09:00",
                                "09:30",
                                "10:00",
                                "10:30",
                                "11:00",
                                "11:30",
                                "12:00",
                                "12:30",
                                "13:00",
                                "13:30",
                                "14:00",
                                "14:30",
                                "15:00",
                                "15:30",
                                "16:00",
                                "16:30",
                                "17:00",
                                "17:30"
                              ],
                              "2025-09-21": [],
                              "2025-09-22": [
                                "09:00",
                                "09:30",
                                "10:00",
                                "10:30",
                                "11:00",
                                "11:30",
                                "12:00",
                                "12:30",
                                "13:00",
                                "13:30",
                                "14:00",
                                "14:30",
                                "15:00",
                                "15:30",
                                "16:00",
                                "16:30",
                                "17:00",
                                "17:30"
                              ]
                            }
                          },
                          "service": {
                            "customPrice": 500,
                            "customDuration": 30
                          },
                          "distance": 0
                        },
                        {
                          "provider": {
                            "id": "68c3cde6fcd2ba2fd7d2b85b",
                            "userId": null,
                            "uid": "FRKS86798641",
                            "type": "freelancer",
                            "status": "active",
                            "serviceType": "homeBased",
                            "shopId": null,
                            "user": {
                              "firstName": "hamza",
                              "lastName": "Ali",
                              "fullName": "hamza Ali",
                              "phone": "9876543210"
                            },
                            "availableSlots": {
                              "2025-09-16": [
                                "10:00",
                                "10:30",
                                "11:00",
                                "11:30",
                                "12:00",
                                "12:30",
                                "13:00",
                                "13:30",
                                "14:00",
                                "14:30",
                                "15:00",
                                "15:30",
                                "16:00",
                                "16:30",
                                "17:00",
                                "17:30"
                              ],
                              "2025-09-17": [
                                "10:00",
                                "10:30",
                                "11:00",
                                "11:30",
                                "12:00",
                                "12:30",
                                "13:00",
                                "13:30",
                                "14:00",
                                "14:30",
                                "15:00",
                                "15:30",
                                "16:00",
                                "16:30",
                                "17:00",
                                "17:30"
                              ],
                              "2025-09-18": [
                                "10:00",
                                "10:30",
                                "11:00",
                                "11:30",
                                "12:00",
                                "12:30",
                                "13:00",
                                "13:30",
                                "14:00",
                                "14:30",
                                "15:00",
                                "15:30",
                                "16:00",
                                "16:30",
                                "17:00",
                                "17:30"
                              ],
                              "2025-09-19": [
                                "10:00",
                                "10:30",
                                "11:00",
                                "11:30",
                                "12:00",
                                "12:30",
                                "13:00",
                                "13:30",
                                "14:00",
                                "14:30",
                                "15:00",
                                "15:30",
                                "16:00",
                                "16:30",
                                "17:00",
                                "17:30"
                              ],
                              "2025-09-20": [
                                "10:00",
                                "10:30",
                                "11:00",
                                "11:30",
                                "12:00",
                                "12:30",
                                "13:00",
                                "13:30",
                                "14:00",
                                "14:30",
                                "15:00",
                                "15:30",
                                "16:00",
                                "16:30",
                                "17:00",
                                "17:30"
                              ],
                              "2025-09-21": [],
                              "2025-09-22": [
                                "09:00",
                                "09:30",
                                "10:00",
                                "10:30",
                                "11:00",
                                "11:30",
                                "12:00",
                                "12:30",
                                "13:00",
                                "13:30",
                                "14:00",
                                "14:30",
                                "15:00",
                                "15:30",
                                "16:00",
                                "16:30"
                              ]
                            }
                          },
                          "service": {
                            "id": "68bd1f9609aebd1b829ba2b5",
                            "customPrice": 500,
                            "customDuration": 30
                          },
                          "distance": 0
                        },
                        {
                          "provider": {
                            "id": "68c3ccc8fcd2ba2fd7d2b84f",
                            "userId": null,
                            "uid": "BAMY60322584",
                            "type": "barber",
                            "status": "active",
                            "serviceType": "homeBased",
                            "shopId": null,
                            "user": {
                              "firstName": "Ali",
                              "lastName": "Khalid",
                              "fullName": "Ali Khalid",
                              "phone": "9876543210"
                            },
                            "availableSlots": {
                              "2025-09-16": [
                                "09:00",
                                "09:30",
                                "10:00",
                                "10:30",
                                "11:00",
                                "11:30",
                                "12:00",
                                "12:30",
                                "13:00",
                                "13:30",
                                "14:00",
                                "14:30",
                                "15:00",
                                "15:30",
                                "16:00",
                                "16:30"
                              ],
                              "2025-09-17": [
                                "09:00",
                                "09:30",
                                "10:00",
                                "10:30",
                                "11:00",
                                "11:30",
                                "12:00",
                                "12:30",
                                "13:00",
                                "13:30",
                                "14:00",
                                "14:30",
                                "15:00",
                                "15:30",
                                "16:00",
                                "16:30"
                              ],
                              "2025-09-18": [
                                "09:00",
                                "09:30",
                                "10:00",
                                "10:30",
                                "11:00",
                                "11:30",
                                "12:00",
                                "12:30",
                                "13:00",
                                "13:30",
                                "14:00",
                                "14:30",
                                "15:00",
                                "15:30",
                                "16:00",
                                "16:30"
                              ],
                              "2025-09-19": [
                                "09:00",
                                "09:30",
                                "10:00",
                                "10:30",
                                "11:00",
                                "11:30",
                                "12:00",
                                "12:30",
                                "13:00",
                                "13:30",
                                "14:00",
                                "14:30",
                                "15:00",
                                "15:30",
                                "16:00",
                                "16:30"
                              ],
                              "2025-09-20": [
                                "10:00",
                                "10:30",
                                "11:00",
                                "11:30",
                                "12:00",
                                "12:30",
                                "13:00",
                                "13:30",
                                "14:00",
                                "14:30",
                                "15:00",
                                "15:30"
                              ],
                              "2025-09-21": [],
                              "2025-09-22": [
                                "09:00",
                                "09:30",
                                "10:00",
                                "10:30",
                                "11:00",
                                "11:30",
                                "12:00",
                                "12:30",
                                "13:00",
                                "13:30",
                                "14:00",
                                "14:30",
                                "15:00",
                                "15:30",
                                "16:00",
                                "16:30"
                              ]
                            }
                          },
                          "service": {
                            "id": "68bd1f9609aebd1b829ba2b5",
                            "customPrice": 500,
                            "customDuration": 30
                          },
                          "distance": 0
                        }
                      ]
                    }
                  }
                }
              }
            }
          }
        },
      '/api/auth/login': {
        post: {
          summary: 'User login',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: {
                      type: 'string',
                      format: 'email',
                      example: 'customer@example.com'
                    },
                    password: {
                      type: 'string',
                      example: 'Password123!'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Successful login',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean',
                        example: true
                      },
                      message: {
                        type: 'string',
                        example: 'Login successful'
                      },
                      data: {
                        type: 'object',
                        properties: {
                          user: {
                            $ref: '#/components/schemas/User'
                          },
                          token: {
                            type: 'string',
                            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/auth/verify-email': {
        post: {
          summary: 'Request email verification',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email'],
                  properties: {
                    email: {
                      type: 'string',
                      format: 'email',
                      example: 'shopowner1@example.com'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Email verification request sent',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean',
                        example: true
                      },
                      message: {
                        type: 'string',
                        example: 'Verification email sent'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/auth/verify-email-otp': {
        post: {
          summary: 'Verify email with OTP',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'otp'],
                  properties: {
                    email: {
                      type: 'string',
                      format: 'email',
                      example: 'customer@example.com'
                    },
                    otp: {
                      type: 'string',
                      example: '1234'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Email OTP verified',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean',
                        example: true
                      },
                      message: {
                        type: 'string',
                        example: 'Email verified successfully'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/auth/forgot-password': {
        post: {
          summary: 'Request password reset',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email'],
                  properties: {
                    email: {
                      type: 'string',
                      format: 'email',
                      example: 'barber@example.com'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Password reset request sent',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean',
                        example: true
                      },
                      message: {
                        type: 'string',
                        example: 'Password reset email sent'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/auth/verify-reset-otp': {
        post: {
          summary: 'Verify password reset OTP',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'otp'],
                  properties: {
                    email: {
                      type: 'string',
                      format: 'email',
                      example: 'customer@example.com'
                    },
                    otp: {
                      type: 'string',
                      example: '1234'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Password reset OTP verified',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean',
                        example: true
                      },
                      message: {
                        type: 'string',
                        example: 'OTP verified successfully'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/auth/reset-password': {
        post: {
          summary: 'Reset user password',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['token', 'password'],
                  properties: {
                    token: {
                      type: 'string',
                      example: 'aafda8325aba0ecc6da3c468ba0628a446fbf17f'
                    },
                    password: {
                      type: 'string',
                      example: 'Password123!'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Password reset successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean',
                        example: true
                      },
                      message: {
                        type: 'string',
                        example: 'Password reset successful'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/auth/change-password': {
        post: {
          summary: 'Change user password',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['currentPassword', 'newPassword', 'confirmPassword'],
                  properties: {
                    currentPassword: {
                      type: 'string',
                      example: 'Password456!'
                    },
                    newPassword: {
                      type: 'string',
                      example: 'Password123!'
                    },
                    confirmPassword: {
                      type: 'string',
                      example: 'Password123!'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Password changed successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean',
                        example: true
                      },
                      message: {
                        type: 'string',
                        example: 'Password changed successfully'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/customers/profile': {
        get: {
          summary: 'Get customer profile',
          responses: {
            '200': {
              description: 'Customer profile retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean',
                        example: true
                      },
                      data: {
                        $ref: '#/components/schemas/CustomerProfile'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/freelancers/profile': {
        put: {
          summary: 'Update freelancer profile',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    profile: {
                      type: 'object',
                      properties: {
                        phoneNumber: { type: 'string', example: '9876543210' }
                      }
                    },
                    location: {
                      type: 'object',
                      properties: {
                        type: { type: 'string', example: 'Point' },
                        coordinates: {
                          type: 'array',
                          items: { type: 'number' },
                          example: [-122.4194, 37.7749]
                        },
                        formattedAddress: { type: 'string', example: '123 Main St, City, Country' }
                      }
                    },
                    serviceType: { type: 'string', example: 'homeBased' },
                    services: {
                      type: 'array',
                      items: { type: 'string' },
                      example: ['68bd1f9609aebd1b829ba2b6', '68bd1f9609aebd1b829ba2b7']
                    },
                    schedule: {
                      type: 'object',
                      properties: {
                        monday: { $ref: '#/components/schemas/ScheduleDay' },
                        tuesday: { $ref: '#/components/schemas/ScheduleDay' },
                        wednesday: { $ref: '#/components/schemas/ScheduleDay' },
                        thursday: { $ref: '#/components/schemas/ScheduleDay' },
                        friday: { $ref: '#/components/schemas/ScheduleDay' },
                        saturday: { $ref: '#/components/schemas/ScheduleDay' },
                        sunday: { $ref: '#/components/schemas/ScheduleDay' }
                      }
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Freelancer profile updated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Freelancer profile updated successfully' },
                      data: { type: 'object' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/barbers/profile': {
        put: {
          summary: 'Update barber profile',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    profile: {
                      type: 'object',
                      properties: {
                        phoneNumber: { type: 'string', example: '1234567890' }
                      }
                    },
                    location: {
                      type: 'object',
                      properties: {
                        type: { type: 'string', example: 'Point' },
                        coordinates: {
                          type: 'array',
                          items: { type: 'number' },
                          example: [-122.4194, 37.7749]
                        },
                        formattedAddress: { type: 'string', example: '456 Barber St, City, Country' }
                      }
                    },
                    serviceType: { type: 'string', example: 'shopBased' },
                    services: {
                      type: 'array',
                      items: { type: 'string' },
                      example: ['68bd1f9609aebd1b829ba2b6', '68bd1f9609aebd1b829ba2b7']
                    },
                    schedule: {
                      type: 'object',
                      properties: {
                        monday: { $ref: '#/components/schemas/ScheduleDay' },
                        tuesday: { $ref: '#/components/schemas/ScheduleDay' },
                        wednesday: { $ref: '#/components/schemas/ScheduleDay' },
                        thursday: { $ref: '#/components/schemas/ScheduleDay' },
                        friday: { $ref: '#/components/schemas/ScheduleDay' },
                        saturday: { $ref: '#/components/schemas/ScheduleDay' },
                        sunday: { $ref: '#/components/schemas/ScheduleDay' }
                      }
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Barber profile updated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Barber profile updated successfully' },
                      data: { type: 'object' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/services/nearby/services': {
        get: {
          summary: 'Get nearby services',
          description: 'Returns services available near the provided latitude and longitude.',
          parameters: [
            {
              name: 'lat',
              in: 'query',
              required: true,
              schema: {
                type: 'number',
                example: 33
              },
              description: 'Latitude'
            },
            {
              name: 'long',
              in: 'query',
              required: true,
              schema: {
                type: 'number',
                example: 77
              },
              description: 'Longitude'
            }
          ],
          responses: {
            '200': {
              description: 'Nearby services list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      count: { type: 'integer', example: 2 },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            _id: { type: 'string', example: '68bd1f9609aebd1b829ba2b4' },
                            uid: { type: 'string', example: 'SVAB12345678' },
                            title: { type: 'string', example: 'Haircut' },
                            description: { type: 'string', example: 'Professional haircut service including wash and style' },
                            price: { type: 'number', example: 500 },
                            duration: { type: 'integer', example: 30 },
                            status: { type: 'string', example: 'approved' },
                            category: { type: 'string', example: 'Haircut' },
                            icon: { type: 'object', example: {} },
                            provider: {
                              type: 'object',
                              properties: {
                                id: { type: 'string', nullable: true, example: null },
                                uid: { type: 'string', example: 'system' },
                                type: { type: 'string', example: 'system' },
                                name: { type: 'string', example: 'System Service' },
                                distance: { type: 'number', example: 0 },
                                location: { type: 'object', nullable: true, example: null }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/bookings/shop-available-slots': {
        get: {
          summary: 'Get slots for shop',
          description: 'Returns available booking slots for a shop on a specific date and service.',
          parameters: [
            {
              name: 'shopId',
              in: 'query',
              required: true,
              schema: {
                type: 'string',
                example: '68be83c37461fe135c3ea28e'
              },
              description: 'Shop ID'
            },
            {
              name: 'date',
              in: 'query',
              required: true,
              schema: {
                type: 'string',
                format: 'date',
                example: '2025-09-12'
              },
              description: 'Date (YYYY-MM-DD)'
            },
            {
              name: 'serviceId',
              in: 'query',
              required: true,
              schema: {
                type: 'string',
                example: '68bd1f9609aebd1b829ba2b4'
              },
              description: 'Service ID'
            }
          ],
          responses: {
            '200': {
              description: 'Available slots for shop',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            hour: { type: 'integer', example: 9 },
                            minute: { type: 'integer', example: 0 }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/bookings/available-slots': {
        get: {
          summary: 'Available slots for barber/freelancer',
          description: 'Returns available booking slots for a barber or freelancer on a specific date and service.',
          parameters: [
            {
              name: 'barberId',
              in: 'query',
              required: true,
              schema: {
                type: 'string',
                example: '68c3cde6fcd2ba2fd7d2b85b'
              },
              description: 'Barber/Freelancer ID'
            },
            {
              name: 'date',
              in: 'query',
              required: true,
              schema: {
                type: 'string',
                format: 'date',
                example: '2025-09-12'
              },
              description: 'Date (YYYY-MM-DD)'
            },
            {
              name: 'serviceId',
              in: 'query',
              required: true,
              schema: {
                type: 'string',
                example: '68bd1f9609aebd1b829ba2b4'
              },
              description: 'Service ID'
            }
          ],
          responses: {
            '200': {
              description: 'Available slots for barber/freelancer',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            hour: { type: 'integer', example: 10 },
                            minute: { type: 'integer', example: 0 }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/dashboard': {
        get: {
          summary: 'Get dashboard data for authenticated user',
          description: 'Returns comprehensive dashboard information including user profile, services, bookings, earnings, and statistics for the authenticated user.',
          security: [
            {
              bearerAuth: []
            }
          ],
          responses: {
            '200': {
              description: 'Dashboard data retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          user: {
                            type: 'object',
                            properties: {
                              _id: { type: 'string', example: '68c3cde6fcd2ba2fd7d2b85b' },
                              email: { type: 'string', format: 'email', example: 'freelancer@test.com' },
                              firstName: { type: 'string', example: 'hamza' },
                              lastName: { type: 'string', example: 'Ali' },
                              role: { type: 'string', example: 'freelancer' },
                              profileImage: { type: 'string', nullable: true, example: null },
                              emailVerified: { type: 'boolean', example: true },
                              status: { type: 'string', example: 'active' }
                            }
                          },
                          profile: {
                            type: 'object',
                            properties: {
                              services: {
                                type: 'array',
                                items: {
                                  type: 'object',
                                  properties: {
                                    _id: { type: 'string', example: '68bd1f9609aebd1b829ba2b5' },
                                    title: { type: 'string', example: 'Beard Trim' },
                                    price: { type: 'number', example: 300 },
                                    duration: { type: 'integer', example: 15 },
                                    category: { type: 'string', example: 'Grooming' }
                                  }
                                }
                              },
                              serviceType: { type: 'string', example: 'homeBased' },
                              schedule: {
                                type: 'object',
                                properties: {
                                  monday: {
                                    type: 'object',
                                    properties: {
                                      from: { type: 'string', example: '09:00' },
                                      to: { type: 'string', example: '17:00' },
                                      status: { type: 'string', example: 'available' }
                                    }
                                  },
                                  tuesday: {
                                    type: 'object',
                                    properties: {
                                      from: { type: 'string', example: '10:00' },
                                      to: { type: 'string', example: '18:00' },
                                      status: { type: 'string', example: 'available' }
                                    }
                                  },
                                  wednesday: {
                                    type: 'object',
                                    properties: {
                                      from: { type: 'string', example: '10:00' },
                                      to: { type: 'string', example: '18:00' },
                                      status: { type: 'string', example: 'available' }
                                    }
                                  },
                                  thursday: {
                                    type: 'object',
                                    properties: {
                                      from: { type: 'string', example: '10:00' },
                                      to: { type: 'string', example: '18:00' },
                                      status: { type: 'string', example: 'available' }
                                    }
                                  },
                                  friday: {
                                    type: 'object',
                                    properties: {
                                      from: { type: 'string', example: '10:00' },
                                      to: { type: 'string', example: '18:00' },
                                      status: { type: 'string', example: 'available' }
                                    }
                                  },
                                  saturday: {
                                    type: 'object',
                                    properties: {
                                      from: { type: 'string', example: '10:00' },
                                      to: { type: 'string', example: '18:00' },
                                      status: { type: 'string', example: 'available' }
                                    }
                                  },
                                  sunday: {
                                    type: 'object',
                                    properties: {
                                      status: { type: 'string', example: 'unavailable' }
                                    }
                                  }
                                }
                              },
                              location: {
                                type: 'object',
                                properties: {
                                  latitude: { type: 'number', example: 33 },
                                  longitude: { type: 'number', example: 73 },
                                  formattedAddress: { type: 'string', example: '123 Main St, City, Country' }
                                }
                              }
                            }
                          },
                          bookings: {
                            type: 'object',
                            properties: {
                              stats: {
                                type: 'object',
                                properties: {
                                  today: { type: 'integer', example: 0 },
                                  thisWeek: { type: 'integer', example: 1 },
                                  thisMonth: { type: 'integer', example: 1 },
                                  pending: { type: 'integer', example: 0 },
                                  confirmed: { type: 'integer', example: 1 },
                                  completed: { type: 'integer', example: 0 },
                                  total: { type: 'integer', example: 2 }
                                }
                              },
                              recent: {
                                type: 'array',
                                items: {
                                  type: 'object',
                                  properties: {
                                    id: { type: 'string', example: '68c939cba254e1a19ed6f94d' },
                                    customerName: { type: 'string', example: 'Nasir Hussain' },
                                    customerPhone: { type: 'string', example: '1234567890' },
                                    serviceName: { type: 'string', example: 'Haircut' },
                                    date: { type: 'string', format: 'date-time', example: '2025-09-17T00:00:00.000Z' },
                                    time: {
                                      type: 'object',
                                      properties: {
                                        hour: { type: 'integer', example: 12 },
                                        minute: { type: 'integer', example: 0 },
                                        _id: { type: 'string', example: '68c939cba254e1a19ed6f94e' }
                                      }
                                    },
                                    status: { type: 'string', example: 'confirmed' },
                                    price: { type: 'number', example: 500 }
                                  }
                                }
                              }
                            }
                          },
                          earnings: {
                            type: 'object',
                            properties: {
                              today: { type: 'number', example: 0 },
                              thisWeek: { type: 'number', example: 0 },
                              thisMonth: { type: 'number', example: 0 },
                              total: { type: 'number', example: 0 }
                            }
                          },
                          payments: {
                            type: 'object',
                            properties: {
                              totalEarned: { type: 'number', example: 0 },
                              recentPayments: {
                                type: 'array',
                                items: { type: 'object' },
                                example: []
                              }
                            }
                          },
                          notifications: {
                            type: 'array',
                            items: { type: 'object' },
                            example: []
                          },
                          stats: {
                            type: 'object',
                            properties: {
                              totalBookings: { type: 'integer', example: 2 },
                              totalEarnings: { type: 'number', example: 0 },
                              responseTime: { type: 'string', example: '2 hours' },
                              completionRate: { type: 'number', example: 0 }
                            }
                          }
                        }
                      }
                    }
                  },
                  example: {
                    "success": true,
                    "data": {
                      "user": {
                        "_id": "68c3cde6fcd2ba2fd7d2b85b",
                        "email": "freelancer@test.com",
                        "firstName": "hamza",
                        "lastName": "Ali",
                        "role": "freelancer",
                        "profileImage": null,
                        "emailVerified": true,
                        "status": "active"
                      },
                      "profile": {
                        "services": [
                          {
                            "_id": "68bd1f9609aebd1b829ba2b5",
                            "title": "Beard Trim",
                            "price": 300,
                            "duration": 15,
                            "category": "Grooming"
                          },
                          {
                            "_id": "68bd1f9609aebd1b829ba2b4",
                            "title": "Haircut",
                            "price": 500,
                            "duration": 30,
                            "category": "Haircut"
                          }
                        ],
                        "serviceType": "homeBased",
                        "schedule": {
                          "monday": {
                            "from": "09:00",
                            "to": "17:00",
                            "status": "available"
                          },
                          "tuesday": {
                            "from": "10:00",
                            "to": "18:00",
                            "status": "available"
                          },
                          "wednesday": {
                            "from": "10:00",
                            "to": "18:00",
                            "status": "available"
                          },
                          "thursday": {
                            "from": "10:00",
                            "to": "18:00",
                            "status": "available"
                          },
                          "friday": {
                            "from": "10:00",
                            "to": "18:00",
                            "status": "available"
                          },
                          "saturday": {
                            "from": "10:00",
                            "to": "18:00",
                            "status": "available"
                          },
                          "sunday": {
                            "status": "unavailable"
                          }
                        },
                        "location": {
                          "latitude": 33,
                          "longitude": 73,
                          "formattedAddress": "123 Main St, City, Country"
                        }
                      },
                      "bookings": {
                        "stats": {
                          "today": 0,
                          "thisWeek": 1,
                          "thisMonth": 1,
                          "pending": 0,
                          "confirmed": 1,
                          "completed": 0,
                          "total": 2
                        },
                        "recent": [
                          {
                            "id": "68c939cba254e1a19ed6f94d",
                            "customerName": "Nasir Hussain",
                            "customerPhone": "1234567890",
                            "serviceName": "Haircut",
                            "date": "2025-09-17T00:00:00.000Z",
                            "time": {
                              "hour": 12,
                              "minute": 0,
                              "_id": "68c939cba254e1a19ed6f94e"
                            },
                            "status": "confirmed",
                            "price": 500
                          },
                          {
                            "id": "68c3db17bacd90f0b187ec14",
                            "customerName": "Nasir Hussain",
                            "customerPhone": "1234567890",
                            "serviceName": "Haircut",
                            "date": "2025-09-12T00:30:00.000Z",
                            "time": {
                              "hour": 17,
                              "minute": 30,
                              "_id": "68c3db17bacd90f0b187ec15"
                            },
                            "status": "rescheduled",
                            "price": 500
                          }
                        ]
                      },
                      "earnings": {
                        "today": 0,
                        "thisWeek": 0,
                        "thisMonth": 0,
                        "total": 0
                      },
                      "payments": {
                        "totalEarned": 0,
                        "recentPayments": []
                      },
                      "notifications": [],
                      "stats": {
                        "totalBookings": 2,
                        "totalEarnings": 0,
                        "responseTime": "2 hours",
                        "completionRate": 0
                      }
                    }
                  }
                }
              }
            },
            '401': {
              description: 'Unauthorized - Invalid or missing access token',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Access token is required' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/shops': {
        get: {
          tags: ['Shops'],
          summary: 'Get shops',
          description: 'Returns a list of shops with optional filtering and pagination',
          parameters: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1 },
              description: 'Page number'
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 10 },
              description: 'Number of items per page'
            },
            {
              name: 'search',
              in: 'query',
              schema: { type: 'string' },
              description: 'Search term'
            },
            {
              name: 'latitude',
              in: 'query',
              schema: { type: 'number' },
              description: 'Latitude for location-based search'
            },
            {
              name: 'longitude',
              in: 'query',
              schema: { type: 'number' },
              description: 'Longitude for location-based search'
            },
            {
              name: 'radius',
              in: 'query',
              schema: { type: 'number', default: 50 },
              description: 'Search radius in km'
            }
          ],
          responses: {
            '200': {
              description: 'Shops retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: { type: 'object' }
                      },
                      pagination: { type: 'object' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/shops/{id}/services': {
        get: {
          tags: ['Shops'],
          summary: 'Get services for a specific shop',
          description: 'Returns all services offered by a specific shop',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Shop ID'
            },
            {
              name: 'status',
              in: 'query',
              schema: { type: 'string', default: 'approved' },
              description: 'Service status filter'
            },
            {
              name: 'category',
              in: 'query',
              schema: { type: 'string' },
              description: 'Service category filter'
            }
          ],
          responses: {
            '200': {
              description: 'Services retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: { type: 'object' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/shops/{id}/service-providers': {
        get: {
          tags: ['Shops'],
          summary: 'Get service providers for a specific shop',
          description: 'Returns service providers for a specific shop and service',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Shop ID'
            },
            {
              name: 'serviceId',
              in: 'query',
              required: true,
              schema: { type: 'string' },
              description: 'Service ID'
            },
            {
              name: 'serviceType',
              in: 'query',
              required: true,
              schema: { type: 'string', enum: ['homeBased', 'shopBased'] },
              description: 'Service type'
            }
          ],
          responses: {
            '200': {
              description: 'Service providers retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      count: { type: 'integer', example: 3 },
                      providers: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            provider: {
                              oneOf: [
                                {
                                  type: 'object',
                                  properties: {
                                    id: { type: 'string', example: '68be83c37461fe135c3ea28e' },
                                    uid: { type: 'string', example: 'SHHD25505091' },
                                    type: { type: 'string', example: 'shop' },
                                    name: { type: 'string', example: 'Premium Cuts Salon' },
                                    email: { type: 'string', example: '' },
                                    phone: { type: 'string', example: '+1234567890' },
                                    address: { type: 'string', example: '123 Business St, City, State 12345' },
                                    rating: { type: 'number', example: 0 },
                                    reviewCount: { type: 'integer', example: 0 },
                                    description: { type: 'string', example: '' },
                                    images: { type: 'array', items: { type: 'string' }, example: [] },
                                    mainImage: { type: 'string', nullable: true, example: null },
                                    serviceType: { type: 'string', example: 'shopBased' },
                                    location: {
                                      type: 'object',
                                      properties: {
                                        latitude: { type: 'number', example: 33 },
                                        longitude: { type: 'number', example: 73 }
                                      }
                                    },
                                    shopOwner: {
                                      type: 'object',
                                      properties: {
                                        id: { type: 'string', example: '68bd453719c2ac93dd4cb0c4' },
                                        email: { type: 'string', example: 'shopowner@test.com' },
                                        firstName: { type: 'string', example: 'Imran' },
                                        lastName: { type: 'string', example: 'Majead' },
                                        fullName: { type: 'string', example: 'Imran Majead' }
                                      }
                                    },
                                    barbers: {
                                      type: 'array',
                                      items: { type: 'object' },
                                      example: []
                                    }
                                  }
                                },
                                {
                                  type: 'object',
                                  properties: {
                                    id: { type: 'string', example: '68c5a27cae791a81ecd95c97' },
                                    userId: { type: 'string', example: 'USLO00522004' },
                                    uid: { type: 'string', example: 'BACB65271747' },
                                    type: { type: 'string', example: 'barber' },
                                    status: { type: 'string', example: 'active' },
                                    serviceType: { type: 'string', example: 'shopBased' },
                                    shopId: { type: 'string', example: '68be83c37461fe135c3ea28e' },
                                    user: {
                                      type: 'object',
                                      properties: {
                                        firstName: { type: 'string', example: 'sammar' },
                                        lastName: { type: 'string', example: 'Sajid' },
                                        fullName: { type: 'string', example: 'sammar Sajid' },
                                        phone: { type: 'string', example: '' }
                                      }
                                    }
                                  }
                                }
                              ]
                            },
                            service: {
                              type: 'object',
                              properties: {
                                id: { type: 'string', example: '68bd1f9609aebd1b829ba2b4' },
                                customPrice: { type: 'number', example: 0 },
                                customDuration: { type: 'integer', example: 30 }
                              }
                            },
                            distance: { type: 'number', example: 0 }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: ['./src/api/**/*.js'], // Scan route files for @swagger comments
};

const swaggerSpec = swaggerJsdoc(options);

function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
      defaultModelsExpandDepth: -1
    }
  }));
}

module.exports = setupSwagger;
