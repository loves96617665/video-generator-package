const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { authorizeApiKey, rateLimiter, logger } = require('./middleware/auth');
const apiRoutes = require('./routes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(logger);

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API Documentation Endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'AI Video Generator API',
        version: '1.0.0',
        description: 'Professional AI Video & Image Generation Platform',
        endpoints: {
            models: '/api/models',
            generate: {
                video: '/api/generate/video',
                image: '/api/generate/image'
            },
            status: '/api/status/:jobId',
            result: '/api/result/:jobId'
        },
        authentication: 'API Key required via X-API-Key header',
        rate_limit: '60 requests per minute'
    });
});

// Apply rate limiting to all API routes
app.use('/api', rateLimiter(60, 60000));

// API Routes
app.use('/api', authorizeApiKey, apiRoutes);

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);

    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            success: false,
            error: 'Request entity too large (max 50MB)'
        });
    }

    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`AI Video Generator API running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`API Key protection: ${process.env.VALID_API_KEYS ? 'Enabled' : 'Disabled (no keys set)'}`);
});

module.exports = app;