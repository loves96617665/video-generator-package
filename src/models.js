/**
 * Model Configuration Manager
 * Manages all available video and image generation models
 */

class ModelManager {
    constructor() {
        this.videoModels = new Map();
        this.imageModels = new Map();
        this.initializeModels();
    }

    initializeModels() {
        // Video Models
        this.registerVideoModel('ltx-2-5', {
            name: 'LTX Video 2.5 Distilled',
            description: 'LTX-2.5 Distilled (22B) - video with synchronized audio, Text-to-Video and Image-to-Video',
            provider: 'Lightricks',
            spaceId: 'lightricks-ltx-2-5',
            resType: 'ltx-2-5',
            supportT2V: true,
            supportI2V: true,
            maxResolution: { width: 1472, height: 832 },
            parameters: {
                duration: { type: 'number', default: 5, min: 2, max: 10, step: 1 },
                steps: { type: 'number', default: 11, min: 4, max: 50, step: 1 },
                guidance: { type: 'number', default: 7.5, min: 1, max: 15, step: 0.5 },
                seed: { type: 'number', default: -1 },
                randomize_seed: { type: 'boolean', default: true }
            },
            resolutions: {
                '16:9': { width: 1472, height: 832 },
                '9:16': { width: 832, height: 1472 },
                '1:1': { width: 832, height: 832 },
                '4:3': { width: 1280, height: 960 },
                '3:4': { width: 960, height: 1280 }
            }
        });

        this.registerVideoModel('ltx-2-3', {
            name: 'LTX Video 2.3 Distilled',
            description: 'High quality, supports both Text-to-Video and Image-to-Video',
            provider: 'Lightricks',
            spaceId: 'Lightricks/LTX-2-3',
            resType: 'ltx-2-3',
            supportT2V: true,
            supportI2V: true,
            maxResolution: { width: 1536, height: 1024 },
            parameters: {
                duration: { type: 'number', default: 5, min: 2, max: 10 },
                steps: { type: 'number', default: 10, min: 4, max: 50 },
                guidance: { type: 'number', default: 7.5, min: 1, max: 15 },
                seed: { type: 'number', default: -1 }
            },
            resolutions: {
                '16:9': { width: 1536, height: 1024 },
                '9:16': { width: 1024, height: 1536 },
                '1:1': { width: 1024, height: 1024 },
                '4:3': { width: 1280, height: 1024 },
                '3:4': { width: 1024, height: 1280 }
            }
        });

        this.registerVideoModel('minimax-h3', {
            name: 'MiniMax H3',
            description: 'Video with synchronized audio, Text-to-Video and Image-to-Video (28 steps)',
            provider: 'MiniMax',
            spaceId: 'multimodalart/minimax-h3',
            resType: 'minimax-h3',
            supportT2V: true,
            supportI2V: true,
            maxResolution: { width: 960, height: 544 },
            parameters: {
                duration: { type: 'number', default: 5, min: 2, max: 10 },
                steps: { type: 'number', default: 28, min: 10, max: 50 },
                seed: { type: 'number', default: -1 }
            },
            resolutions: {
                '16:9': { width: 960, height: 544 },
                '9:16': { width: 544, height: 960 },
                '1:1': { width: 544, height: 544 },
                '4:3': { width: 768, height: 576 },
                '3:4': { width: 576, height: 768 }
            }
        });

        this.registerVideoModel('wan2-2-fast', {
            name: 'Wan 2.2 Fast',
            description: 'High speed generation, supports both Text-to-Video and Image-to-Video, ~480p resolution',
            provider: 'Wan-AI',
            spaceId: 'kingnish/wan2-2-fast',
            resType: 'wan',
            supportT2V: true,
            supportI2V: true,
            maxResolution: { width: 832, height: 480 },
            parameters: {
                duration: { type: 'number', default: 5, min: 2, max: 10 },
                steps: { type: 'number', default: 4, min: 2, max: 20 },
                guidance: { type: 'number', default: 7, min: 1, max: 15 },
                seed: { type: 'number', default: -1 },
                randomize_seed: { type: 'boolean', default: true }
            },
            resolutions: {
                '16:9': { width: 832, height: 480 },
                '9:16': { width: 480, height: 832 },
                '1:1': { width: 640, height: 640 },
                '4:3': { width: 640, height: 480 },
                '3:4': { width: 480, height: 640 }
            }
        });

        this.registerVideoModel('omni-video-factory', {
            name: 'Omni Video Factory',
            description: 'Fast motion generation with custom scene motion',
            provider: 'Omni',
            spaceId: 'FrameAI4687/Omni-Video-Factory',
            resType: 'omni-videos',
            supportT2V: true,
            supportI2V: true,
            maxResolution: { width: 512, height: 288 },
            parameters: {
                scene_count: { type: 'number', default: 1, min: 1, max: 5 },
                duration: { type: 'number', default: 5, min: 3, max: 15 },
                seed: { type: 'number', default: -1 }
            },
            resolutions: {
                '16:9': { width: 512, height: 288 },
                '9:16': { width: 288, height: 512 },
                '1:1': { width: 512, height: 512 },
                '4:3': { width: 512, height: 384 },
                '3:4': { width: 384, height: 512 }
            }
        });

        this.registerVideoModel('ltx-2-3-f2lf', {
            name: 'LTX-2.3 First-Last Frame',
            description: 'Advanced control with first and last frame specification',
            provider: 'Lightricks',
            spaceId: 'linoyts/LTX-2-3-First-Last-Frame',
            resType: 'ltx-2-3',
            supportT2V: true,
            supportI2V: true,
            special: 'first_last_frame',
            parameters: {
                duration: { type: 'number', default: 5, min: 2, max: 10 },
                steps: { type: 'number', default: 10, min: 4, max: 50 },
                seed: { type: 'number', default: -1 }
            },
            resolutions: {
                '16:9': { width: 1536, height: 1024 },
                '9:16': { width: 1024, height: 1536 },
                '1:1': { width: 1024, height: 1024 }
            }
        });

        // Image Models
        this.registerImageModel('gptimage2', {
            name: 'GPT Image 2',
            description: 'OpenAI next-generation image generation',
            provider: 'OpenAI',
            supportInpainting: true,
            supportEditing: true,
            parameters: {
                size: {
                    type: 'select',
                    default: '1024x1024',
                    options: ['512x512', '1024x1024', '1792x1024', '1024x1792']
                },
                quality: { type: 'select', default: 'standard', options: ['standard', 'hd'] },
                style: { type: 'select', default: 'vivid', options: ['vivid', 'natural', 'anime', 'cinematic'] }
            }
        });

        this.registerImageModel('flux-2', {
            name: 'Flux 2 AI',
            description: 'Black Forest Labs Flux 2 - high quality image generation',
            provider: 'Black Forest Labs',
            supportInpainting: true,
            parameters: {
                size: {
                    type: 'select',
                    default: '1024x1024',
                    options: ['512x512', '768x768', '1024x1024', '1536x1536', '2048x2048']
                },
                steps: { type: 'number', default: 30, min: 10, max: 100 },
                guidance: { type: 'number', default: 3.5, min: 1, max: 20, step: 0.5 },
                scheduler: { type: 'select', default: 'euler', options: ['euler', 'ddim', 'dpm', 'lms'] }
            }
        });

        this.registerImageModel('seedream-4', {
            name: 'Seedream 4.0',
            description: 'Samsung SDS advanced image generation model',
            provider: 'Samsung',
            supportInpainting: true,
            parameters: {
                size: { type: 'select', default: '1024x1024', options: ['512x512', '768x768', '1024x1024'] },
                steps: { type: 'number', default: 28, min: 10, max: 50 },
                seed: { type: 'number', default: -1 }
            }
        });

        this.registerImageModel('qwen-image', {
            name: 'Qwen Image Generator',
            description: 'Alibaba Qwen image generation model',
            provider: 'Alibaba',
            supportInpainting: false,
            parameters: {
                size: { type: 'select', default: '1024x1024', options: ['512x512', '1024x1024', '1536x1536'] },
                steps: { type: 'number', default: 20, min: 10, max: 50 },
                style: { type: 'select', default: 'default', options: ['default', 'chillout_mode', 'creative'] }
            }
        });

        this.registerImageModel('nano-banana', {
            name: 'Nano Banana AI',
            description: 'Lightweight image generation model',
            provider: 'Unknown',
            supportInpainting: false,
            parameters: {
                size: { type: 'select', default: '1024x1024', options: ['512x512', '1024x1024'] },
                steps: { type: 'number', default: 20, min: 10, max: 30 }
            }
        });
    }

    registerVideoModel(id, config) {
        this.videoModels.set(id, config);
    }

    registerImageModel(id, config) {
        this.imageModels.set(id, config);
    }

    getVideoModel(id) {
        return this.videoModels.get(id);
    }

    getImageModel(id) {
        return this.imageModels.get(id);
    }

    getAllVideoModels() {
        const models = [];
        for (const [id, config] of this.videoModels) {
            models.push({ id, ...config });
        }
        return models;
    }

    getAllImageModels() {
        const models = [];
        for (const [id, config] of this.imageModels) {
            models.push({ id, ...config });
        }
        return models;
    }

    getSupportedModelsByType(type) {
        return type === 'image' ? this.getAllImageModels() : this.getAllVideoModels();
    }

    validateParameters(modelId, params, type = 'video') {
        const model = type === 'image' ? this.getImageModel(modelId) : this.getVideoModel(modelId);

        if (!model) {
            throw new Error(`Model ${modelId} not found`);
        }

        const errors = [];

        // Validate parameters
        for (const [key, value] of Object.entries(params)) {
            if (model.parameters[key]) {
                const paramDef = model.parameters[key];

                if (paramDef.min !== undefined && value < paramDef.min) {
                    errors.push(`${key} must be at least ${paramDef.min}`);
                }
                if (paramDef.max !== undefined && value > paramDef.max) {
                    errors.push(`${key} must be at most ${paramDef.max}`);
                }
                if (paramDef.options && !paramDef.options.includes(value)) {
                    errors.push(`${key} must be one of: ${paramDef.options.join(', ')}`);
                }
            }
        }

        return errors;
    }
}

// Export singleton instance
const modelManager = new ModelManager();

module.exports = {
    ModelManager,
    modelManager
};