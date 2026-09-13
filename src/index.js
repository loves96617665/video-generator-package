/**
 * Cloudflare Workers Entry Point
 * Native Workers implementation (no Express dependency)
 */

import { modelManager } from './models';
import { videoGenerator } from './generator';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
    'Access-Control-Max-Age': '86400',
};

// API Key validation
function validateApiKey(request, env) {
    const apiKey = request.headers.get('X-API-Key');
    const authHeader = request.headers.get('Authorization');

    // Check API Key header
    if (apiKey) {
        const validKeys = env.VALID_API_KEYS?.split(',') || [];
        if (validKeys.length === 0 || validKeys.includes(apiKey)) {
            return true;
        }
        return false;
    }

    // Check Bearer token
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        // Simple token validation (in production, use JWT)
        const validTokens = env.VALID_TOKENS?.split(',') || [];
        if (validTokens.includes(token)) {
            return true;
        }
        return false;
    }

    // Allow if no keys configured
    if (!env.VALID_API_KEYS || env.VALID_API_KEYS === '') {
        return true;
    }

    return false;
}

// JSON response helper
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
        },
    });
}

// Handle OPTIONS (CORS preflight)
function handleOptions() {
    return new Response(null, {
        status: 204,
        headers: corsHeaders,
    });
}

// Serve static file from ASSETS binding
async function serveStaticFile(request, env) {
    const url = new URL(request.url);
    let pathname = url.pathname;

    // Default to index.html for root path
    if (pathname === '/' || pathname === '') {
        pathname = '/index.html';
    }

    // Try to fetch from ASSETS
    if (env.ASSETS && env.ASSETS.fetch) {
        const assetRequest = new Request(request.url.replace(url.pathname, pathname), request);
        const response = await env.ASSETS.fetch(assetRequest);
        if (response.status !== 404) {
            return response;
        }
    }

    return null;
}

// Main request handler
async function handleRequest(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS preflight
    if (method === 'OPTIONS') {
        return handleOptions();
    }

    // Health check
    if (path === '/health') {
        return jsonResponse({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
        });
    }

    // API documentation
    if (path === '/api' || path === '/api/') {
        return jsonResponse({
            name: 'AI Video Generator API',
            version: '1.0.0',
            description: 'Professional AI Video & Image Generation Platform',
            endpoints: {
                models: '/api/models',
                generate: {
                    video: '/api/generate/video',
                    image: '/api/generate/image',
                },
                status: '/api/status/:jobId',
                result: '/api/result/:jobId',
            },
            authentication: 'API Key required via X-API-Key header',
        });
    }

    // API Key validation for protected routes
    if (path.startsWith('/api/')) {
        if (!validateApiKey(request, env)) {
            return jsonResponse({ success: false, error: 'Invalid API Key' }, 401);
        }
    }

    // Get models
    if (path === '/api/models' && method === 'GET') {
        return jsonResponse({
            success: true,
            data: {
                video: modelManager.getAllVideoModels(),
                image: modelManager.getAllImageModels(),
            },
        });
    }

    // Get video models
    if (path === '/api/models/video' && method === 'GET') {
        return jsonResponse({
            success: true,
            data: modelManager.getAllVideoModels(),
        });
    }

    // Get image models
    if (path === '/api/models/image' && method === 'GET') {
        return jsonResponse({
            success: true,
            data: modelManager.getAllImageModels(),
        });
    }

    // Generate video from text
    if (path === '/api/generate/video/text' && method === 'POST') {
        try {
            const body = await request.json();
            const {
                modelId,
                prompt,
                negativePrompt = '',
                duration = 5,
                steps,
                guidance,
                seed = -1,
                aspectRatio = '16:9',
            } = body;

            if (!modelId || !prompt) {
                return jsonResponse({ success: false, error: 'modelId and prompt are required' }, 400);
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
            });

            return jsonResponse(result);
        } catch (error) {
            return jsonResponse({ success: false, error: error.message }, 500);
        }
    }

    // Generate video from image
    if (path === '/api/generate/video/image' && method === 'POST') {
        try {
            const body = await request.json();
            const {
                modelId,
                prompt,
                imageUrl,
                negativePrompt = '',
                duration = 5,
                steps,
                guidance,
                seed = -1,
                aspectRatio = '16:9',
            } = body;

            if (!modelId || !prompt || !imageUrl) {
                return jsonResponse({ success: false, error: 'modelId, prompt, and imageUrl are required' }, 400);
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
                aspectRatio,
            });

            return jsonResponse(result);
        } catch (error) {
            return jsonResponse({ success: false, error: error.message }, 500);
        }
    }

    // Generate image
    if (path === '/api/generate/image' && method === 'POST') {
        try {
            const body = await request.json();
            const {
                modelId,
                prompt,
                width = 1024,
                height = 1024,
                steps = 20,
                guidance = 7.5,
                seed = -1,
            } = body;

            if (!modelId || !prompt) {
                return jsonResponse({ success: false, error: 'modelId and prompt are required' }, 400);
            }

            const model = modelManager.getImageModel(modelId);
            if (!model) {
                return jsonResponse({ success: false, error: `Model ${modelId} not found` }, 404);
            }

            const jobId = `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            return jsonResponse({
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
                    seed: seed === -1 ? Math.floor(Math.random() * 2147483647) : seed,
                },
            });
        } catch (error) {
            return jsonResponse({ success: false, error: error.message }, 500);
        }
    }

    // Get job status
    if (path.startsWith('/api/status/') && method === 'GET') {
        const jobId = path.split('/').pop();
        const status = videoGenerator.getJobStatus(jobId);
        return jsonResponse(status);
    }

    // Get job result
    if (path.startsWith('/api/result/') && method === 'GET') {
        const jobId = path.split('/').pop();
        const result = videoGenerator.getJobResult(jobId);
        return jsonResponse(result);
    }

    // Serve static files (for non-API routes)
    if (!path.startsWith('/api/')) {
        const staticResponse = await serveStaticFile(request, env);
        if (staticResponse) {
            return staticResponse;
        }
    }

    // 404 - Try to serve index.html for SPA routing
    if (!path.startsWith('/api/')) {
        const indexResponse = await serveStaticFile(request, env);
        if (indexResponse && indexResponse.status === 200) {
            return indexResponse.clone();
        }
    }

    // 404 Not Found
    return jsonResponse({
        success: false,
        error: 'Endpoint not found',
        path,
        method,
    }, 404);
}

// Cloudflare Workers entry point
export default {
    async fetch(request, env, ctx) {
        return handleRequest(request, env, ctx);
    },
};