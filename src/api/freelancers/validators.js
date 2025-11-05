const Joi = require('joi');

exports.freelancerValidationSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    phoneNumber: Joi.string().required(),
    address: Joi.string().required(),
    city: Joi.string().required(),
    zipCode: Joi.string().required(),
    countryId: Joi.string().required(),
    services: Joi.array().items(Joi.string()).min(1).required(),
    schedule: Joi.string().required(), // Will be parsed as JSON
    serviceType: Joi.string().valid('homeBased', 'shopBased', 'both').required(),
    location: Joi.object({
        latitude: Joi.number().required(),
        longitude: Joi.number().required(),
        formattedAddress: Joi.string().required()
    }).required()
});