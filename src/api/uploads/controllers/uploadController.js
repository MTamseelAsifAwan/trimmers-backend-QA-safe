// src/api/uploads/controllers/uploadController.js
const fileUploadService = require('../../../services/fileUploadService');

/**
 * Upload a single file
 * @route POST /api/uploads/single
 * @access Public or Protected? (assuming public for now, but may need auth)
 */
const uploadSingleFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const folder = req.body.folder || '';
        const fileUrl = await fileUploadService.uploadFile(req.file.buffer, req.file.originalname, folder);

        res.status(200).json({
            success: true,
            message: 'File uploaded successfully',
            fileUrl
        });
    } catch (error) {
        console.error('Upload single file error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Upload multiple files
 * @route POST /api/uploads/multiple
 * @access Public or Protected?
 */
const uploadMultipleFiles = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded' });
        }

        const folder = req.body.folder || '';
        const files = req.files.map(file => ({
            buffer: file.buffer,
            fileName: file.originalname,
            folder
        }));

        const fileUrls = await fileUploadService.uploadMultipleFiles(files);

        res.status(200).json({
            success: true,
            message: 'Files uploaded successfully',
            fileUrls
        });
    } catch (error) {
        console.error('Upload multiple files error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    uploadSingleFile,
    uploadMultipleFiles
};