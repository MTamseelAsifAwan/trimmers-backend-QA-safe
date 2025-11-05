// src/services/fileUploadService.js
const crypto = require('crypto');
const path = require('path');
const logger = require('../utils/logger');

const fs = require('fs');
const util = require('util');
const mkdir = util.promisify(fs.mkdir);
const writeFile = util.promisify(fs.writeFile);
const unlink = util.promisify(fs.unlink);
const access = util.promisify(fs.access);

const UPLOADS_BASE = path.join(__dirname, '../../uploads');

/**
 * FileUploadService provides methods for file uploads and management
 */

class FileUploadService {
    constructor() {
        // No S3, using local storage
        this.uploadsBase = UPLOADS_BASE;
        // Ensure uploads directory exists
        if (!fs.existsSync(this.uploadsBase)) {
            fs.mkdirSync(this.uploadsBase, { recursive: true });
        }
    }

    /**
     * Upload file to S3
     * @param {Buffer} fileBuffer - File data buffer
     * @param {string} fileName - Original file name
     * @param {string} folder - Folder to store file in (e.g., 'profile-images', 'shop-images')
     * @returns {Promise<string>} - URL of the uploaded file
     */
    async uploadFile(fileBuffer, fileName, folder = '') {
        try {
            // Generate unique file name to prevent overwriting
            const uniqueFileName = this._generateUniqueFileName(fileName);
            const folderPath = folder ? path.join(this.uploadsBase, folder) : this.uploadsBase;
            // Ensure folder exists
            await mkdir(folderPath, { recursive: true });
            const filePath = path.join(folderPath, uniqueFileName);
            await writeFile(filePath, fileBuffer);
            logger.info(`File uploaded locally: ${filePath}`);
            // Return a local URL (relative path)
            const relativePath = path.relative(path.join(__dirname, '../../'), filePath).replace(/\\/g, '/');
            return `/${relativePath}`;
        } catch (error) {
            logger.error(`File upload error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Delete file from S3
     * @param {string} fileUrl - URL of the file to delete
     * @returns {Promise<boolean>} - Success status
     */
    async deleteFile(fileUrl) {
        try {
            // fileUrl is a relative path like /uploads/folder/filename.ext
            const filePath = path.join(__dirname, '../../', fileUrl);
            await unlink(filePath);
            logger.info(`File deleted locally: ${filePath}`);
            return true;
        } catch (error) {
            logger.error(`File deletion error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Generate a signed URL for temporary access to private files
     * @param {string} fileUrl - URL of the file
     * @param {number} expirySeconds - Expiry time in seconds
     * @returns {Promise<string>} - Signed URL
     */
    async getSignedUrl(fileUrl, expirySeconds = 3600) {
        // For local storage, just return the fileUrl (no signing needed)
        return fileUrl;
    }

    /**
     * Upload multiple files
     * @param {Array<Object>} files - Array of {buffer, fileName, folder} objects
     * @returns {Promise<Array<string>>} - Array of uploaded file URLs
     */
    async uploadMultipleFiles(files) {
        try {
            const uploadPromises = files.map(file =>
                this.uploadFile(file.buffer, file.fileName, file.folder)
            );
            return await Promise.all(uploadPromises);
        } catch (error) {
            logger.error(`Multiple files upload error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Generate unique file name to prevent overwriting
     * @param {string} originalName - Original file name
     * @returns {string} - Unique file name
     * @private
     */
    _generateUniqueFileName(originalName) {
        const timestamp = Date.now();
        const randomString = crypto.randomBytes(8).toString('hex');
        const extension = path.extname(originalName);
        const baseName = path.basename(originalName, extension)
            .replace(/[^a-zA-Z0-9]/g, '-')
            .toLowerCase();

        return `${baseName}-${timestamp}-${randomString}${extension}`;
    }

    /**
     * Determine content type based on file extension
     * @param {string} fileName - File name
     * @returns {string} - Content type
     * @private
     */
    _getContentType(fileName) {
        const extension = path.extname(fileName).toLowerCase();

        const contentTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        };

        return contentTypes[extension] || 'application/octet-stream';
    }

    /**
     * Extract key from S3 URL
     * @param {string} url - S3 URL
     * @returns {string|null} - Extracted key or null if invalid
     * @private
     */
    // No need for _extractKeyFromUrl in local storage

    /**
     * Generate mock URL for development
     * @param {string} fileName - File name
     * @param {string} folder - Folder
     * @returns {string} - Mock URL
     * @private
     */
    // No need for _generateMockUrl in local storage
}

module.exports = new FileUploadService();