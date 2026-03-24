require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Import services and routes
const database = require('../services/database');
const ollamaService = require('../services/ollama');

// Import routes
const chiliRoutes = require('../routes/chili');
const voteRoutes = require('../routes/votes');
const ocrRoutes = require('../routes/ocr');
const resultsRoutes = require('../routes/results');
const configRoutes = require('../routes/config');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174', 
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177',
    'http://localhost:5178',
    'http://localhost:5179'
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    server: 'Chili Cook-Off API',
    version: '1.0.0'
  });
});

// Attach database to request object
app.use(async (req, res, next) => {
  req.db = database;
  req.ollama = ollamaService;
  next();
});

// API Routes
app.use('/api/chilis', chiliRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/config', configRoutes);

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Initialize database and start server
async function startServer() {
  try {
    // Connect to database
    await database.connect();
    await database.initialize();
    
    console.log('✅ Database initialized successfully');

    // Test Ollama connection (optional)
    try {
      // const isConnected = await ollamaService.testConnection();
      // if (isConnected) {
      //   console.log('✅ Ollama OCR service is available');
      // } else {
      //   console.log('⚠️  Ollama OCR service is not available - OCR features will be disabled');
      // }
      console.log('✅ OCR features will be disabled (Ollama service not configured)');
    } catch (error) {
      console.log('⚠️  OCR features will be disabled:', error.message);
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Chili Cook-Off server running on port ${PORT}`);
      console.log(`📱 Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
      console.log(`🔧 API Base URL: http://localhost:${PORT}/api`);
      console.log(`📁 Upload directory: ${uploadsDir}`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  await database.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  await database.close();
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

startServer();
