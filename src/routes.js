/**
 * API Routes
 * All API endpoints for the video generator platform
 */

const express = require('express');
const router = express.Router();
const { modelManager } = require('./models');
const { videoGenerator } = require('./generator');

/**
 * GET /api/models
 * Get all available models
 */
router.get('/models', (req, res) => {
    res.json({
        success: true,
        data: {
            video: modelManager.getAllVideoModels(),
            image: modelManager.getAllImageModels()
        }
    });
});

/**
 * GET /api/models/video
 * Get video generation models
 */
router.get('/models/video', (req, res) => {
    res.json({
        success: true,
        data: modelManager.getAllVideoModels()
    });
});

/**
 * GET /api/models/image
 * Get image generation models
 */
router.get('/models/image', (req, res) => {
    res.json({
        success: true,
        data: modelManager.getAllImageModels()
    });
});

/**
 * GET /api/models/:type/:id
 * Get specific model details
 */
router.get('/models/:type/:id', (req, res) => {
    const { type, id } = req.params;

    const model = type === 'image'
        ? modelManager.getImageModel(id)
        : modelManager.getVideoModel(id);

    if (!model) {
        return res.status(404).json({
            success: false,
            error: `Model ${id} not found`
        });
    }

    res.json({
        success: true,
        data: { id, ...model }
    });
});

/**
 * POST /api/generate/video/text
 * Generate video from text prompt
 */
router.post('/generate/video/text', async (req, res) => {
    try {
        const {
            modelId,
            prompt,
            negativePrompt = '',
            duration = 5,
            steps,
            guidance,
            seed = -1,
            aspectRatio = '16:9',
            style = 'default'
        } = req.body;

        // Validate parameters
        const errors = modelManager.validateParameters(modelId, {
            duration,
            steps,
            guidance,
            seed
        }, 'video');

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                errors
            });
        }

        const result = await videoGenerator.generateTextToVideo({
            modelId,
            prompt,
            negativePrompt,
            duration,
            steps,
            guidance,
            seed,
            aspectRatio,
            style
        });

        res.json(result);

    } catch (error) {
        console.error('T2V generation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/generate/video/image
 * Generate video from image
 */
router.post('/generate/video/image', async (req, res) => {
    try {
        const {
            modelId,
            prompt,
            imageUrl,
            negativePrompt = '',
            duration = 5,
            steps,
            guidance,
            seed = -1,
            aspectRatio = '16:9'
        } = req.body;

        // Validate parameters
        const errors = modelManager.validateParameters(modelId, {
            duration,
            steps,
            guidance,
            seed
        }, 'video');

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                errors
            });
        }

        const result = await videoGenerator.generateImageToVideo({
            modelId,
            prompt,
            imageUrl,
            negativePrompt,
            duration,
            steps,
            guidance,
            seed,
            aspectRatio
        });

        res.json(result);

    } catch (error) {
        console.error('I2V generation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/generate/image
 * Generate image
 */
router.post('/generate/image', async (req, res) => {
    try {
        const {
            modelId,
            prompt,
            width = 1024,
            height = 1024,
            steps = 20,
            guidance = 7.5,
            seed = -1,
            negativePrompt,
            style,
            quality
        } = req.body;

        const model = modelManager.getImageModel(modelId);

        if (!model) {
            return res.status(404).json({
                success: false,
                error: `Model ${modelId} not found`
            });
        }

        const jobId = `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const result = {
            success: true,
            jobId,
            status: 'queued',
            message: 'Image generation started',
            model: modelId,
            parameters: {
                width,
                height,
                steps,
                guidance,
                seed: seed === -1 ? Math.floor(Math.random() * 2147483647) : seed
            }
        };

        res.json(result);

    } catch (error) {
        console.error('Image generation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/status/:jobId
 * Get generation job status
 */
router.get('/status/:jobId', (req, res) => {
    const { jobId } = req.params;
    const status = videoGenerator.getJobStatus(jobId);
    res.json(status);
});

/**
 * GET /api/result/:jobId
 * Get generation result
 */
router.get('/result/:jobId', (req, res) => {
    const { jobId } = req.params;
    const result = videoGenerator.getJobResult(jobId);
    res.json(result);
});

/**
 * POST /api/batch
 * Batch generation
 */
router.post('/batch', async (req, res) => {
    const { requests, batchSize = 5 } = req.body;

    if (!Array.isArray(requests) || requests.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'requests must be an array'
        });
    }

    const results = [];

    for (let i = 0; i < Math.min(requests.length, batchSize); i++) {
        const request = requests[i];

        try {
            let result;

            if (request.type === 'video') {
                if (request.mode === 't2v') {
                    result = await videoGenerator.generateTextToVideo(request);
                } else {
                    result = await videoGenerator.generateImageToVideo(request);
                }
            } else if (request.type === 'image') {
                const model = modelManager.getImageModel(request.modelId);
                if (!model) {
                    throw new Error(`Model ${request.modelId} not found`);
                }
                const jobId = `image_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`;
                result = { jobId, status: 'queued', model: request.modelId };
            }

            results.push(result);
        } catch (error) {
            results.push({ error: error.message, request: request.id || i });
        }
    }

    res.json({
        success: true,
        batchSize: results.length,
        results
    });
});

/**
 * POST /api/validate
 * Validate generation parameters
 */
router.post('/validate', (req, res) => {
    const { modelId, type, parameters } = req.body;

    const errors = modelManager.validateParameters(modelId, parameters, type || 'video');

    if (errors.length > 0) {
        return res.json({
            valid: false,
            errors
        });
    }

    res.json({ valid: true });
});

module.exports = router;