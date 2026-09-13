/**
 * Authentication Middleware
 * API Key validation and JWT handling
 */

const jwt = require('jsonwebtoken');

/**
 * API Key Authorization Middleware
 */
const authorizeApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const authHeader = req.headers['authorization'];

    // Check for API Key header
    if (apiKey) {
        const validKeys = process.env.VALID_API_KEYS?.split(',') || [];

        if (validKeys.length === 0 || validKeys.includes(apiKey)) {
            req.apiKey = apiKey;
            return next();
        }

        return res.status(401).json({
            success: false,
            error: 'Invalid API Key'
        });
    }

    // Check for Bearer token
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
            req.user = decoded;
            return next();
        } catch (error) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }
    }

    // Allow public access if no keys configured
    if (!process.env.VALID_API_KEYS || process.env.VALID_API_KEYS === '') {
        return next();
    }

    return res.status(401).json({
        success: false,
        error: 'API Key is required. Provide it in X-API-Key header or Authorization Bearer token'
    });
};

/**
 * Rate Limiting Middleware
 */
const rateLimiter = (maxRequests = 60, windowMs = 60000) => {
    const requests = new Map();

    return (req, res, next) => {
        const clientId = req.ip || req.headers['x-api-key'] || 'anonymous';
        const now = Date.now();

        if (!requests.has(clientId)) {
            requests.set(clientId, []);
        }

        const clientRequests = requests.get(clientId);

        // Remove old requests
        const validRequests = clientRequests.filter(time => now - time < windowMs);
        requests.set(clientId, validRequests);

        // Check rate limit
        if (validRequests.length >= maxRequests) {
            return res.status(429).json({
                success: false,
                error: 'Rate limit exceeded',
                retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000)
            });
        }

        validRequests.push(now);
        next();
    };
};

/**
 * Request Validation Middleware
 */
const validateRequest = (schema) => {
    return (req, res, next) => {
        if (!schema) return next();

        const { error, value } = schema.validate(req.body);

        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                details: error.details.map(d => d.message)
            });
        }

        req.validatedBody = value;
        next();
    };
};

/**
 * Logging Middleware
 */
const logger = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    });

    next();
};

module.exports = {
    authorizeApiKey,
    rateLimiter,
    validateRequest,
    logger
};