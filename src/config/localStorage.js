// src/config/localStorage.js
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    logger.info('Created uploads directory');
}

// Create subdirectories for different types of uploads
const createUploadDir = (subDir) => {
    const dirPath = path.join(uploadsDir, subDir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        logger.info(`Created upload subdirectory: ${subDir}`);
    }
    return dirPath;
};

// Upload file to local storage
const uploadToLocal = async (file, folder = 'general') => {
    try {
        // Create the upload directory if it doesn't exist
        const uploadDir = createUploadDir(folder);

        // Generate unique filename
        const timestamp = Date.now();
        const originalName = file.originalname || file.name || 'file';
        const extension = path.extname(originalName);
        const baseName = path.basename(originalName, extension);
        const fileName = `${timestamp}-${baseName}${extension}`;
        const filePath = path.join(uploadDir, fileName);

        // Write file to disk
        const fileBuffer = file.buffer || file;
        fs.writeFileSync(filePath, fileBuffer);

        // Generate URL for the file (relative to server root)
        const relativePath = path.relative(path.join(__dirname, '../..'), filePath).replace(/\\/g, '/');
        const fileUrl = `${process.env.API_URL || 'http://localhost:5000'}/${relativePath}`;

        logger.info(`File uploaded successfully to local storage: ${fileUrl}`);

        return {
            Location: fileUrl,
            Key: relativePath,
            Bucket: 'local',
            ETag: `"${timestamp}"`
        };
    } catch (error) {
        logger.error(`Error uploading file to local storage: ${error.message}`);
        throw error;
    }
};

// Delete file from local storage
const deleteFromLocal = async (filePath) => {
    try {
        const fullPath = path.join(__dirname, '../../', filePath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            logger.info(`File deleted from local storage: ${filePath}`);
            return true;
        }
        return false;
    } catch (error) {
        logger.error(`Error deleting file from local storage: ${error.message}`);
        throw error;
    }
};

// Get file stats
const getFileStats = (filePath) => {
    try {
        const fullPath = path.join(__dirname, '../../', filePath);
        return fs.statSync(fullPath);
    } catch (error) {
        logger.error(`Error getting file stats: ${error.message}`);
        return null;
    }
};

module.exports = {
    uploadToLocal,
    deleteFromLocal,
    getFileStats,
    uploadsDir
};