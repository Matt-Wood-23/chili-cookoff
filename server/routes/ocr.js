const express = require('express');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'));
    }
  },
});

// GET /api/ocr/test - Test OCR service connection
router.get('/test', async (req, res) => {
  try {
    const isConnected = await req.ollama.testConnection();
    const models = await req.ollama.getAvailableModels();
    
    res.json({
      success: isConnected,
      message: isConnected ? 'OCR service is available' : 'OCR service is not available',
      models: models,
      service: 'Ollama qwen2.5-vl:3b'
    });
  } catch (error) {
    console.error('OCR test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test OCR service',
      message: error.message
    });
  }
});

// GET /api/ocr/models - Get available models
router.get('/models', async (req, res) => {
  try {
    const models = await req.ollama.getAvailableModels();
    res.json({
      success: true,
      models: models
    });
  } catch (error) {
    console.error('Failed to get models:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch models',
      message: error.message
    });
  }
});

// POST /api/ocr/process - Process uploaded image file
router.post('/process', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    const chiliName = req.body.chili_name || '';
    
    console.log('Processing OCR for image:', req.file.originalname);
    
    // Process the image with Ollama
    const result = await req.ollama.processImageFile(req.file.buffer, chiliName);

    // extractScoresheetData swallows failures and returns all-zero scores, so
    // report those as a failure instead of handing the judge silent defaults.
    if (result.error) {
      return res.status(502).json({
        success: false,
        error: 'Could not read the scoresheet',
        message: result.error
      });
    }

    res.json({
      success: true,
      data: result,
      filename: req.file.originalname,
      processed_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('OCR processing failed:', error);
    res.status(500).json({
      success: false,
      error: 'OCR processing failed',
      message: error.message
    });
  }
});

// POST /api/ocr/process-base64 - Process base64 encoded image data
router.post('/process-base64', async (req, res) => {
  try {
    const { imageData, chili_name } = req.body;
    
    if (!imageData) {
      return res.status(400).json({
        success: false,
        error: 'No image data provided'
      });
    }

    // Ensure imageData is a valid base64 string with data URL prefix
    let base64Data = imageData;
    if (!base64Data.startsWith('data:')) {
      base64Data = `data:image/jpeg;base64,${base64Data}`;
    }
    
    console.log('Processing OCR for base64 image data');
    
    // Process the image with Ollama
    const result = await req.ollama.extractScoresheetData(base64Data, chili_name || '');

    if (result.error) {
      return res.status(502).json({
        success: false,
        error: 'Could not read the scoresheet',
        message: result.error
      });
    }

    res.json({
      success: true,
      data: result,
      processed_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('OCR processing failed:', error);
    res.status(500).json({
      success: false,
      error: 'OCR processing failed',
      message: error.message
    });
  }
});

// POST /api/ocr/batch - Process multiple images
router.post('/batch', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No images provided'
      });
    }

    const chiliNames = req.body.chili_names ? JSON.parse(req.body.chili_names) : [];
    
    console.log(`Processing ${req.files.length} images in batch`);
    
    // Convert file buffers to an array
    const imageBuffers = req.files.map(file => file.buffer);
    
    // Process all images
    const results = await req.ollama.processMultipleImages(imageBuffers, chiliNames);
    
    res.json({
      success: true,
      data: results,
      total_processed: results.length,
      processed_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Batch OCR processing failed:', error);
    res.status(500).json({
      success: false,
      error: 'Batch OCR processing failed',
      message: error.message
    });
  }
});

// GET /api/ocr/info - Get OCR service information
router.get('/info', async (req, res) => {
  try {
    const systemInfo = await req.ollama.getSystemInfo();
    
    res.json({
      success: true,
      service_info: systemInfo,
      capabilities: [
        'Scoresheet OCR',
        'JSON extraction',
        'Multiple image processing',
        'Base64 image processing'
      ],
      supported_formats: ['JPEG', 'PNG', 'GIF'],
      max_file_size: '10MB',
      model: 'qwen2.5-vl:3b'
    });

  } catch (error) {
    console.error('Failed to get OCR info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get OCR service information',
      message: error.message
    });
  }
});

// DELETE /api/ocr/cache - Clear any cached data (if implemented)
router.delete('/cache', async (req, res) => {
  try {
    // Currently no caching implemented, but endpoint ready for future use
    res.json({
      success: true,
      message: 'OCR cache cleared (no caching currently implemented)',
      cleared_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to clear OCR cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large',
        message: 'Maximum file size is 10MB'
      });
    }
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type',
      message: 'Only JPEG, PNG, and GIF images are allowed'
    });
  }

  next(error);
});

module.exports = router;
