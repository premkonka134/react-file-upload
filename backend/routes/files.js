const axios = require('axios');
const qs = require('qs');
const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const Document = require('../models/Document');
const SAPAuthSchema = require('../models/SAPAuth');
const { authenticate, authorize } = require('../middleware/auth');
const azureBlobService = require('../services/azureBlobService');
const { fetchSAPAccessToken } = require('../services/sapAuthService');
const { uploadToSAP, getSAPDocument, getSAPDocumentJobs } = require('../services/sapDocumentService');

const FormData = require('form-data');
const router = express.Router();
const mongoose = require('mongoose');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024, // 100MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || [
      'pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif', 'xlsx', 'xls', 'ppt', 'pptx'
    ];

    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();

    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`File type .${fileExtension} is not allowed`), false);
    }
  }
});

// @route   POST /api/files/upload
// @desc    Upload a file
// @access  Private
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // If you destructure with default values, use let instead of const
    // Example: let { someVar = defaultValue } = req.body;

    const accessToken = await fetchSAPAccessToken(req.user._id);
    if (!accessToken) {
      return res.status(500).json({ message: 'Failed to fetch SAP access token' });
    }
    // let filedata = new FormData();
    // filedata.append('file', req.file.buffer, {
    //   filename: req.file.originalname,
    //   contentType: req.file.mimetype
    // });
    // filedata.append('options', '{\n  "schemaName": "SAP_invoice_schema",\n  "clientId": "default",\n  "documentType": "invoice",\n  "receivedDate": "2020-02-17",\n  "enrichment": {\n    "sender": {\n      "top": 5,\n      "type": "businessEntity",\n      "subtype": "supplier"\n    },\n    "employee": {\n      "type": "employee"\n    }\n  }\n}');

    // const config1 = {
    //   method: 'post',
    //   maxBodyLength: Infinity,
    //   url: 'https://aiservices-trial-dox.cfapps.us10.hana.ondemand.com/document-information-extraction/v1/document/jobs',
    //   headers: {
    //     'Content-Type': 'multipart/form-data',
    //     'Accept': 'application/json',
    //     'Authorization': 'Bearer ' + accessToken
    //   },
    //   data: filedata
    // };
    // let sapResponse;
    // try {
    //   sapResponse = await axios.request(config1);
    // } catch (sapError) {
    //   console.error('SAP File Upload Error:', sapError);
    //   return res.status(500).json({ message: 'SAP file upload failed', error: sapError.message });
    // }
    // console.log('SAP File Upload Response:', sapResponse.data);

    const sapResponse = await uploadToSAP(req.file.buffer, req.file.originalname, req.file.mimetype, accessToken);


    // Save document metadata to database
    const document = new Document({
      name: req.file.originalname,
      originalName: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype,
      uploadedBy: req.user._id,
      status: 'uploading', // Initial status
      clientId: 'default', // Optional: set clientId if available
      blobName: sapResponse.id, // Always set this!
      // downloadUrl: uploadResult.downloadUrl (if available)
    });

    await document.save();
    await document.populate('uploadedBy', 'name email');

    res.status(201).json({
      message: 'File uploaded successfully',
      document: {
        id: document._id,
        name: document.name,
        size: document.size,
        type: document.type,
        uploadedBy: document.uploadedBy.email,
        uploadedAt: document.createdAt,
        isShared: document.isShared,
        shareLink: document.shareLink,
        downloadUrl: document.downloadUrl,
        status: document.status,
        clientId: document.clientId,
      }
    });
  } catch (error) {
    if (error instanceof multer.MulterError) {
    res.status(500).json({
      message: error.message || 'File upload failed',
      errorCode: 'FILE_UPLOAD_ERROR',
      context: 'An error occurred during file upload. Please check the file type, size, and SAP connectivity.'
    });
      let message = 'File upload error';
      if (error.code === 'LIMIT_FILE_SIZE') {
        message = 'File size exceeds the allowed limit';
        res.status(413).json({ message });
      } else {
        res.status(400).json({ message: error.message });
      }
    } else {
      console.error('File upload error:', error.message);
      res.status(500).json({ message: error.message || 'File upload failed' });
    }
  }
});

// @route   GET /api/files/my-files
// @desc    Get user's uploaded files
// @access  Private
router.get('/my-files', authenticate, async (req, res) => {
  try {
  let page = parseInt(req.query.page) || 1;
  let limit = parseInt(req.query.limit) || 10;
    const accessToken = await fetchSAPAccessToken(req.user._id);
    if (!accessToken) {
      return res.status(500).json({ message: 'Failed to fetch SAP access token' });
    }
    const sapResponseJobs = await getSAPDocumentJobs(accessToken);
    sapResponseJobs?.results?.map(job => {
      Document.updateOne(
        { blobName: job.id },
        {
          status: job.status,
          sapCreatedAt: job.createdAt,
          sapFinishedAt: job.finished,
          clientId: job.clientId
        }
      ).exec();
    })

    const documents = await Document.find({ uploadedBy: req.user._id })
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Document.countDocuments({ uploadedBy: req.user._id });

    const formattedDocuments = documents.map(doc => ({
      id: doc._id,
      name: doc.name,
      size: doc.size,
      type: doc.type,
      uploadedBy: doc.uploadedBy.email,
      uploadedAt: doc.createdAt,
      isShared: doc.isShared,
      shareLink: doc.shareLink,
      blobName: doc.blobName,
      downloadUrl: doc.downloadUrl,
      status: doc.status,
      sapCreatedAt: doc.sapCreatedAt,
      sapFinishedAt: doc.sapFinishedAt,
      clientId: doc.clientId
    }));



    
    res.json({
      documents: formattedDocuments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error(`Get my files error for user ${req.user?._id || 'unknown'}:`, error.message);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   GET /api/files/team-files
// @desc    Get team shared files
// @access  Private
router.get('/team-files', authenticate, async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    // Update statuses from SAP jobs (same as my-files)
    const accessToken = await fetchSAPAccessToken(req.user._id);
    if (!accessToken) {
      return res.status(500).json({ message: 'Failed to fetch SAP access token' });
    }
    const sapResponseJobs = await getSAPDocumentJobs(accessToken);
    sapResponseJobs?.results?.map(job => {
      Document.updateOne(
        { blobName: job.id },
        {
          status: job.status,
          sapCreatedAt: job.createdAt,
          sapFinishedAt: job.finished,
          clientId: job.clientId
        }
      ).exec();
    })

    // Return all documents (no isTeamShared filter) with pagination
    const documents = await Document.find({})
      .populate('uploadedBy', 'name email')
      .populate('teamSharedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Document.countDocuments({});

    const formattedDocuments = documents.map(doc => ({
      id: doc._id,
      name: doc.name,
      size: doc.size,
      type: doc.type,
      uploadedBy: doc.uploadedBy?.email || doc.uploadedBy?.name,
      uploadedAt: doc.createdAt,
      isShared: doc.isShared,
      isTeamShared: doc.isTeamShared,
      teamSharedBy: doc.teamSharedBy?.email || doc.teamSharedBy?.name,
      blobName: doc.blobName,
      downloadUrl: doc.downloadUrl,
      status: doc.status,
      sapCreatedAt: doc.sapCreatedAt,
      sapFinishedAt: doc.sapFinishedAt,
      clientId: doc.clientId
    }));

    res.json({
      documents: formattedDocuments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get team files error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/files/:id/share
// @desc    Generate share link for a file
// @access  Private
router.post('/:id/share', authenticate, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user owns the document
    if (document.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Generate share token and link
    const shareToken = uuidv4();
    const shareLink = `${process.env.FRONTEND_URL}/shared/${shareToken}`;

    document.isShared = true;
    document.shareToken = shareToken;
    document.shareLink = shareLink;
    document.sharedAt = new Date();

    await document.save();

    res.json({
      message: 'Share link generated successfully',
      shareLink
    });
  } catch (error) {
    console.error('Share file error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/files/:id/share-team
// @desc    Share file with team (Admin only)
// @access  Private/Admin
router.post('/:id/share-team', authenticate, authorize('admin'), async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    document.isTeamShared = true;
    document.teamSharedBy = req.user._id;
    document.teamSharedAt = new Date();

    await document.save();

    res.json({
      message: 'File shared with team successfully'
    });
  } catch (error) {
    console.error('Share team file error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/files/:id
// @desc    Delete a file
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid document ID' });
    }

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    if (!document.blobName) {
      return res.status(404).json({ message: 'Document blob name not found' });
    }
    const accessToken = await fetchSAPAccessToken(req.user._id);
    if (!accessToken) {
      return res.status(500).json({ message: 'Failed to fetch SAP access token' });
    }

    const sapResponse = await getSAPDocument(document.blobName, accessToken);
    if (!sapResponse) {
      return res.status(404).json({ message: 'SAP document not found' });
    }

    res.json({ message: 'File get successfully', data: sapResponse });
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/files/:id
// @desc    Delete a file
// @access  Private
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check permissions: owner can delete their files, admin can delete any file
    const canDelete = document.uploadedBy.toString() === req.user._id.toString() ||
      req.user.role === 'admin';

    if (!canDelete) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete from Azure Blob Storage
    // await azureBlobService.deleteFile(document.blobName);

    // Delete from database
    await Document.findByIdAndDelete(req.params.id);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/files/download/:blobName
// @desc    Download a file (for development mock)
// @access  Public (in development)
router.get('/download/:blobName', async (req, res) => {
  try {
    const blobName = decodeURIComponent(req.params.blobName);

    // In development, serve from mock storage
    if (process.env.NODE_ENV === 'development') {
      const mockFile = azureBlobService.getMockFile(blobName);
      if (!mockFile) {
        return res.status(404).json({ message: 'File not found' });
      }

      res.set({
        'Content-Type': mockFile.mimetype,
        'Content-Disposition': `attachment; filename="${mockFile.originalname}"`,
        'Content-Length': mockFile.size
      });

      return res.send(mockFile.buffer);
    }

    // In production, redirect to Azure Blob Storage URL
    const downloadUrl = await azureBlobService.generateDownloadUrl(blobName);
    res.redirect(downloadUrl);
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ message: 'Download failed' });
  }
});

// @route   GET /api/files/shared/:token
// @desc    Access shared file by token
// @access  Public
router.get('/shared/:token', async (req, res) => {
  try {
    const document = await Document.findOne({
      shareToken: req.params.token,
      isShared: true
    }).populate('uploadedBy', 'name email');

    if (!document) {
      return res.status(404).json({ message: 'Shared file not found or link expired' });
    }

    res.json({
      document: {
        id: document._id,
        name: document.name,
        size: document.size,
        type: document.type,
        uploadedBy: document.uploadedBy.name,
        uploadedAt: document.createdAt,
        downloadUrl: document.downloadUrl
      }
    });
  } catch (error) {
    console.error('Get shared file error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;