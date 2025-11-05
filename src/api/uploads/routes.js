// src/api/uploads/routes.js
const express = require('express');
const router = express.Router();
const uploadController = require('./controllers/uploadController');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * /api/uploads/single:
 *   post:
 *     tags: [Uploads]
 *     summary: Upload a single file
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The file to upload
 *               folder:
 *                 type: string
 *                 description: Optional folder to store the file in
 *                 example: profile-images
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: File uploaded successfully
 *                 fileUrl:
 *                   type: string
 *                   example: /uploads/profile-images/filename-1234567890-abcdef.jpg
 *       400:
 *         description: No file uploaded
 *       500:
 *         description: Server error
 */
router.post('/single', upload.single('file'), uploadController.uploadSingleFile);

/**
 * @swagger
 * /api/uploads/multiple:
 *   post:
 *     tags: [Uploads]
 *     summary: Upload multiple files
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: The files to upload (max 10)
 *               folder:
 *                 type: string
 *                 description: Optional folder to store the files in
 *                 example: gallery
 *     responses:
 *       200:
 *         description: Files uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Files uploaded successfully
 *                 fileUrls:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["/uploads/gallery/file1.jpg", "/uploads/gallery/file2.png"]
 *       400:
 *         description: No files uploaded
 *       500:
 *         description: Server error
 */
router.post('/multiple', upload.array('files', 10), uploadController.uploadMultipleFiles);

module.exports = router;