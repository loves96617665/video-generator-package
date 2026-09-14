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

    if (apiKey) {
        const validKeys = env.VALID_API_KEYS?.split(',') || [];
        if (validKeys.length === 0 || validKeys.includes(apiKey)) {
            return true;
        }
        return false;
    }

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const validTokens = env.VALID_TOKENS?.split(',') || [];
        if (validTokens.includes(token)) {
            return true;
        }
        return false;
    }

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

    if (pathname === '/' || pathname === '') {
        pathname = '/index.html';
    }

    if (env.ASSETS && env.ASSETS.fetch) {
        const urlObj = new URL(request.url);
        urlObj.pathname = pathname;
        const assetRequest = new Request(urlObj, request);
        const response = await env.ASSETS.fetch(assetRequest);
        if (response.status !== 404) {
            return response;
        }
    }

    return null;
}

// Process job status - calls HuggingFace API
async function processJobIfNeeded(job) {
    if (!job) return null;

    // Only process if job hasn't started or is queued
    if (job.status === 'queued' || job.status === 'connecting') {
        job.status = 'connecting';

        try {
            const sessionHash = Math.random().toString(36).substring(2);

            // Join HuggingFace queue
            const joinRes = await fetch(job.spaceUrl + '/gradio_api/queue/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: job.payload,
                    fn_index: job.fnIndex,
                    session_hash: sessionHash
                })
            });

            const joinData = await joinRes.json();
            const eventId = joinData.event_id;
            job.eventId = eventId;
            job.sessionHash = sessionHash;
            job.status = 'processing';
            job.startedAt = new Date();

            // Immediately try to fetch result
            await checkHFStatus(job);

        } catch (error) {
            job.status = 'failed';
            job.error = error.message;
            job.failedAt = new Date();
        }
    } else if (job.status === 'processing' || job.status === 'generating') {
        // Check HuggingFace status
        await checkHFStatus(job);
    }

    return job;
}

// Check HuggingFace for job status
async function checkHFStatus(job) {
    try {
        if (!job.sessionHash) return;

        const statusRes = await fetch(job.spaceUrl + '/gradio_api/queue/data?session_hash=' + job.sessionHash);
        const statusData = await statusRes.json();
        const msg = statusData.msg;

        if (msg === 'process_completed') {
            job.status = 'completed';
            job.completedAt = new Date();
            job.result = statusData.output;
            job.progress = 100;
        } else if (msg === 'process_generating') {
            job.progress = job.progress || 0;
            job.progress = Math.min(job.progress + Math.floor(Math.random() * 15) + 5, 95);
        } else if (msg === 'process_failed' || msg === 'failed') {
            job.status = 'failed';
            job.error = statusData.detail || 'Generation failed';
            job.failedAt = new Date();
        }
    } catch (error) {
        console.error('HF polling error:', error);
    }
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
                return jsonResponse({ success: false, error: 'Model ' + modelId + ' not found' }, 404);
            }

            const jobId = 'image_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

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

        // Get job and process if needed
        let job = videoGenerator.processingJobs.get(jobId);

        if (job) {
            // Process the job if it's in a pending state
            job = await processJobIfNeeded(job);
        }

        const status = videoGenerator.getJobStatus(jobId);
        return jsonResponse(status);
    }

    // Get job result
    if (path.startsWith('/api/result/') && method === 'GET') {
        const jobId = path.split('/').pop();

        // Try to process the job if it's still in progress
        let job = videoGenerator.processingJobs.get(jobId);
        if (job && (job.status === 'queued' || job.status === 'connecting' || job.status === 'processing')) {
            job = await processJobIfNeeded(job);
        }

        const result = videoGenerator.getJobResult(jobId);
        return jsonResponse(result);
    }

    // Serve static files
    if (!path.startsWith('/api/')) {
        const staticResponse = await serveStaticFile(request, env);
        if (staticResponse) {
            return staticResponse;
        }
    }

    // 404
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