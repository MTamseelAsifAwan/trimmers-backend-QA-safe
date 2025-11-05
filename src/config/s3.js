// src/config/s3.js
const AWS = require('aws-sdk');
const logger = require('../utils/logger');

// Initialize AWS S3 configuration
const initS3 = () => {
    // Check if AWS credentials are provided
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        logger.warn('AWS credentials not found. S3 functionality will be limited.');
        return null;
    }

    // Configure AWS SDK
    AWS.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
    });

    // Create and return S3 instance
    const s3 = new AWS.S3();

    // Verify bucket exists
    const bucketName = process.env.AWS_S3_BUCKET;

    if (!bucketName) {
        logger.warn('AWS S3 bucket name not provided in environment variables.');
        return s3;
    }

    // Validate bucket exists and is accessible (optional validation)
    s3.headBucket({ Bucket: bucketName }, (err) => {
        if (err) {
            logger.error(`Error accessing S3 bucket ${bucketName}: ${err.message}`);
            logger.info('Please ensure the bucket exists and IAM permissions are correct');
        } else {
            logger.info(`Successfully connected to S3 bucket: ${bucketName}`);
        }
    });

    return s3;
};

// Export configuration
module.exports = {
    s3: initS3(),
    bucket: process.env.AWS_S3_BUCKET || 'barber-app-uploads',

    // Upload file to S3
    uploadToS3: async (file, folder = '') => {
        const s3 = initS3();
        if (!s3) {
            throw new Error('S3 is not configured');
        }

        const bucketName = process.env.AWS_S3_BUCKET || 'barber-app-uploads';
        const fileName = `${folder ? folder + '/' : ''}${Date.now()}-${file.originalname || file.name}`;

        const params = {
            Bucket: bucketName,
            Key: fileName,
            Body: file.buffer || file,
            ContentType: file.mimetype || 'application/octet-stream',
            ACL: 'public-read'
        };

        try {
            const result = await s3.upload(params).promise();
            logger.info(`File uploaded successfully to S3: ${result.Location}`);
            return result;
        } catch (error) {
            logger.error(`Error uploading file to S3: ${error.message}`);
            throw error;
        }
    }
};