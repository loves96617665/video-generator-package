/**
 * Video Generation Handler
 * Handles video and image generation requests with Gradio API integration
 */

import { modelManager } from './models';

export class VideoGenerator {
    constructor() {
        this.queue = new Map();
        this.processingJobs = new Map();
    }

    /**
     * Build payload from template with variable substitution
     */
    buildPayload(template, vars) {
        return template.map(item => {
            if (typeof item === 'string' && item.startsWith('$')) {
                const key = item.substring(1);
                return vars[key] !== undefined ? vars[key] : null;
            }
            return item;
        });
    }

    /**
     * Get resolution based on aspect ratio and model type
     */
    getResolution(ratio, modelType) {
        const model = modelManager.getVideoModel(modelType);
        const resolutions = model?.resolutions || {
            '16:9': { width: 832, height: 480 },
            '9:16': { width: 480, height: 832 },
            '1:1': { width: 640, height: 640 },
            '4:3': { width: 640, height: 480 },
            '3:4': { width: 480, height: 640 }
        };
        return resolutions[ratio] || resolutions['16:9'];
    }

    /**
     * Generate video from text prompt
     */
    async generateTextToVideo(request) {
        const {
            modelId,
            prompt,
            negativePrompt = '',
            duration = 5,
            steps,
            guidance,
            seed,
            aspectRatio = '16:9',
            style = 'default'
        } = request;

        const model = modelManager.getVideoModel(modelId);

        if (!model) {
            throw new Error(`Model ${modelId} not found`);
        }

        if (!model.supportT2V) {
            throw new Error(`Model ${modelId} does not support Text-to-Video`);
        }

        const resolution = this.getResolution(aspectRatio, modelId);
        const actualSeed = seed === -1 ? Math.floor(Math.random() * 2147483647) : seed;
        const actualSteps = steps || model.parameters.steps.default;
        const actualGuidance = guidance || model.parameters.guidance?.default || 7.5;

        const vars = {
            prompt,
            negative_prompt: negativePrompt || 'Worst Quality, Low Quality, Low Resolution',
            width: resolution.width,
            height: resolution.height,
            steps: actualSteps,
            guidance: actualGuidance,
            seed: actualSeed,
            randomize_seed: seed === -1,
            aspect_ratio: aspectRatio,
            duration: duration
        };

        // Build payload based on model type
        let payloadTemplate = [];
        let fnIndex = 0;
        let spaceUrl = '';

        switch (modelId) {
            case 'ltx-2-5':
                payloadTemplate = [
                    '$prompt',
                    null,
                    '$height',
                    '$width',
                    '$duration',
                    '$seed',
                    'conv',
                    false,
                    '$randomize_seed',
                    true
                ];
                fnIndex = 2;
                spaceUrl = `https://${model.spaceId}.hf.space`;
                break;

            case 'ltx-2-3':
                payloadTemplate = [
                    null,
                    '$prompt',
                    '$duration',
                    false,
                    '$steps',
                    '$randomize_seed',
                    '$width',
                    '$height'
                ];
                fnIndex = 2;
                spaceUrl = `https://${model.spaceId}.hf.space`;
                break;

            case 'minimax-h3':
                payloadTemplate = [
                    '$prompt',
                    null,
                    null,
                    '$canvas',
                    '$duration',
                    '$steps',
                    '$seed',
                    false
                ];
                fnIndex = 3;
                spaceUrl = `https://${model.spaceId}.hf.space`;
                vars.canvas = model.resolutions[aspectRatio].canvas || `${resolution.width}x${resolution.height} · 16:9 fast`;
                break;

            case 'wan2-2-fast':
                payloadTemplate = [
                    null,
                    '$prompt',
                    '$width',
                    '$height',
                    '$negative_prompt',
                    2,
                    0,
                    '$steps',
                    '$seed',
                    '$randomize_seed'
                ];
                fnIndex = 2;
                spaceUrl = `https://${model.spaceId}.hf.space`;
                break;

            case 'omni-video-factory':
                payloadTemplate = [
                    1,
                    '$duration',
                    512,
                    '$aspect_ratio',
                    '$prompt',
                    '$prompt',
                    null,
                    null,
                    null
                ];
                fnIndex = 12;
                spaceUrl = `https://${model.spaceId}.hf.space`;
                break;

            default:
                // Generic payload
                payloadTemplate = [
                    '$prompt',
                    '$negative_prompt',
                    null,
                    null,
                    '$width',
                    '$height',
                    'text-to-video',
                    2,
                    '$steps',
                    '$seed',
                    '$randomize_seed',
                    1,
                    true
                ];
                fnIndex = 4;
                spaceUrl = `https://${model.spaceId}.hf.space`;
        }

        const payload = this.buildPayload(payloadTemplate, vars);

        const jobId = `video_t2v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const job = {
            jobId,
            type: 'text-to-video',
            modelId,
            prompt,
            payload,
            fnIndex,
            spaceUrl,
            status: 'queued',
            createdAt: new Date()
        };

        this.processingJobs.set(jobId, job);

        // Start async generation
        this.processJob(job);

        return {
            success: true,
            jobId,
            status: 'queued',
            message: 'Video generation started',
            model: modelId,
            parameters: {
                duration,
                steps: actualSteps,
                guidance: actualGuidance,
                seed: actualSeed,
                aspectRatio,
                resolution: `${resolution.width}x${resolution.height}`
            }
        };
    }

    /**
     * Generate video from image
     */
    async generateImageToVideo(request) {
        const {
            modelId,
            prompt,
            imageUrl,
            negativePrompt = '',
            duration = 5,
            steps,
            guidance,
            seed,
            aspectRatio = '16:9'
        } = request;

        const model = modelManager.getVideoModel(modelId);

        if (!model) {
            throw new Error(`Model ${modelId} not found`);
        }

        if (!model.supportI2V) {
            throw new Error(`Model ${modelId} does not support Image-to-Video`);
        }

        const resolution = this.getResolution(aspectRatio, modelId);
        const actualSeed = seed === -1 ? Math.floor(Math.random() * 2147483647) : seed;
        const actualSteps = steps || model.parameters.steps?.default || 10;
        const actualGuidance = guidance || model.parameters.guidance?.default || 7.5;

        const vars = {
            prompt,
            negative_prompt: negativePrompt || 'Worst Quality, Low Quality, Low Resolution',
            width: resolution.width,
            height: resolution.height,
            steps: actualSteps,
            guidance: actualGuidance,
            seed: actualSeed,
            randomize_seed: seed === -1,
            aspect_ratio: aspectRatio,
            duration: duration
        };

        let payloadTemplate = [];
        let fnIndex = 0;
        let spaceUrl = '';

        switch (modelId) {
            case 'ltx-2-5-i2v':
                payloadTemplate = [
                    '$prompt',
                    '$image',
                    '$height',
                    '$width',
                    '$duration',
                    '$seed',
                    'conv',
                    false,
                    '$randomize_seed',
                    true
                ];
                fnIndex = 2;
                spaceUrl = `https://lightricks-ltx-2-5.hf.space`;
                break;

            case 'wan2-2-i2v':
                payloadTemplate = [
                    '$image',
                    '$prompt',
                    '$width',
                    '$height',
                    '$negative_prompt',
                    2,
                    0,
                    '$steps',
                    '$seed',
                    '$randomize_seed'
                ];
                fnIndex = 2;
                spaceUrl = `https://${model.spaceId}.hf.space`;
                break;

            default:
                payloadTemplate = [
                    '$prompt',
                    '$negative_prompt',
                    '$image',
                    null,
                    '$width',
                    '$height',
                    'image-to-video',
                    2,
                    '$steps',
                    '$seed',
                    '$randomize_seed',
                    1,
                    true
                ];
                fnIndex = 5;
                spaceUrl = `https://${model.spaceId}.hf.space`;
        }

        // Upload image and get base64
        let imageData = null;
        if (imageUrl) {
            try {
                const response = await fetch(imageUrl);
                const arrayBuffer = await response.arrayBuffer();
                const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
                imageData = {
                    type: 'image/png',
                    size: arrayBuffer.byteLength,
                    url: imageUrl,
                    base64
                };
                vars.image = imageData;
            } catch (e) {
                console.warn('Failed to upload image:', e.message);
            }
        }

        const payload = this.buildPayload(payloadTemplate, vars);

        const jobId = `video_i2v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const job = {
            jobId,
            type: 'image-to-video',
            modelId,
            prompt,
            payload,
            fnIndex,
            spaceUrl,
            status: 'queued',
            createdAt: new Date()
        };

        this.processingJobs.set(jobId, job);
        this.processJob(job);

        return {
            success: true,
            jobId,
            status: 'queued',
            message: 'Image-to-video generation started',
            model: modelId,
            parameters: {
                duration,
                steps: actualSteps,
                guidance: actualGuidance,
                seed: actualSeed,
                aspectRatio,
                resolution: `${resolution.width}x${resolution.height}`
            }
        };
    }

    /**
     * Process job (async generation)
     */
    async processJob(job) {
        job.status = 'processing';
        job.startedAt = new Date();

        try {
            job.status = 'connecting';

            const sessionHash = Math.random().toString(36).substring(2);

            // Join queue
            const joinRes = await fetch(`${job.spaceUrl}/gradio_api/queue/join`, {
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
            job.status = 'queued';

            // Poll for progress (simplified)
            let progress = 0;
            const progressInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch(`${job.spaceUrl}/gradio_api/queue/data?session_hash=${sessionHash}`);
                    const statusData = await statusRes.json();
                    const msg = statusData.msg;

                    if (msg === 'process_completed') {
                        clearInterval(progressInterval);
                        job.status = 'completed';
                        job.completedAt = new Date();
                        job.result = statusData.output;
                    } else if (msg === 'process_generating') {
                        progress = progress === 0 ? 20 : progress + Math.floor(Math.random() * 15) + 5;
                        if (progress > 95) progress = 95;
                        job.progress = progress;
                    }
                } catch (e) {
                    console.error('Progress polling error:', e.message);
                }
            }, 2000);

            // Timeout handler
            setTimeout(() => {
                clearInterval(progressInterval);
                if (job.status !== 'completed') {
                    job.status = 'timeout';
                }
            }, 600000); // 10 minutes timeout

        } catch (error) {
            job.status = 'failed';
            job.error = error.message;
            job.failedAt = new Date();
        }
    }

    /**
     * Get job status
     */
    getJobStatus(jobId) {
        const job = this.processingJobs.get(jobId);
        if (!job) {
            return { status: 'not_found' };
        }

        return {
            jobId,
            type: job.type,
            modelId: job.modelId,
            status: job.status,
            progress: job.progress || 0,
            createdAt: job.createdAt,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
            error: job.error
        };
    }

    /**
     * Get job result
     */
    getJobResult(jobId) {
        const job = this.processingJobs.get(jobId);
        if (!job) {
            return { status: 'not_found' };
        }

        if (job.status !== 'completed') {
            return {
                status: job.status,
                progress: job.progress || 0,
                message: 'Generation not completed'
            };
        }

        // Extract video URL from result
        const result = job.result || {};
        let videoUrl = null;

        if (result.output?.data?.video?.url) {
            videoUrl = result.output.data.video.url;
        } else if (result.data?.video?.url) {
            videoUrl = result.data.video.url;
        } else if (result.output?.data?.url) {
            videoUrl = result.output.data.url;
        }

        return {
            status: 'completed',
            videoUrl,
            previewUrl: videoUrl,
            duration: job.payload?.duration || 5
        };
    }
}

// Export singleton instance
export const videoGenerator = new VideoGenerator();