# AI Video Generator Platform

A professional AI video generation platform supporting Text-to-Video, Image-to-Video, and Image generation with multi-model support and API key authentication.

## Features

- 📽️ **Text-to-Video Generation** - Create videos from text descriptions
- 🖼️ **Image-to-Video Generation** - Generate videos from images
- 🎨 **Image Generation** - Generate images from text prompts
- 🔑 **API Key Authentication** - Secure API access with API keys
- ⚡ **Multi-Model Support** - Multiple video and image generation models
- 📊 **Progress Tracking** - Real-time generation progress
- 🚀 **Cloudflare Workers Ready** - Deploy-ready for Cloudflare

## Supported Models

### Video Models
| Model ID | Name | Type | Resolution | Steps |
|----------|------|------|------------|-------|
| ltx-2-5 | LTX Video 2.5 Distilled | T2V/I2V | 1472x832 | 11 |
| ltx-2-3 | LTX Video 2.3 | T2V/I2V | 1536x1024 | 10 |
| minimax-h3 | MiniMax H3 | T2V/I2V | 960x544 | 28 |
| wan2-2-fast | Wan 2.2 Fast | T2V/I2V | 832x480 | 4-20 |
| omni-video-factory | Omni Video Factory | T2V/I2V | 512x288 | 3 |

### Image Models
| Model ID | Name | Provider |
|----------|------|----------|
| gptimage2 | GPT Image 2 | OpenAI |
| flux-2 | Flux 2 AI | Black Forest Labs |
| seedream-4 | Seedream 4.0 | Samsung SDS |
| qwen-image | Qwen Image | Alibaba |

## API Endpoints

### Authentication
```
X-API-Key: your-api-key
```

Or use Bearer token:
```
Authorization: Bearer your-jwt-token
```

### Get Models
```
GET /api/models
```

### Generate Video from Text
```
POST /api/generate/video/text
Content-Type: application/json

{
  "modelId": "ltx-2-5",
  "prompt": "A beautiful sunset over mountains",
  "duration": 5,
  "aspectRatio": "16:9",
  "steps": 20,
  "guidance": 7.5,
  "seed": -1
}
```

### Generate Video from Image
```
POST /api/generate/video/image
Content-Type: application/json

{
  "modelId": "ltx-2-5-i2v",
  "prompt": "Add flowing water to this image",
  "imageUrl": "https://example.com/image.png",
  "duration": 5,
  "aspectRatio": "16:9"
}
```

### Generate Image
```
POST /api/generate/image
Content-Type: application/json

{
  "modelId": "gptimage2",
  "prompt": "A cute cat wearing glasses",
  "width": 1024,
  "height": 1024,
  "style": "vivid"
}
```

### Get Job Status
```
GET /api/status/:jobId
```

### Get Job Result
```
GET /api/result/:jobId
```

## Environment Variables

```env
PORT=3000
ALLOWED_ORIGINS=https://yourdomain.com
VALID_API_KEYS=key1,key2,key3
JWT_SECRET=your-jwt-secret
ENVIRONMENT=production
```

## Deployment

### Local Development
```bash
npm install
npm run dev
```

### Cloudflare Workers
```bash
npm install -g wrangler
wrangler login
wrangler deploy
```

### Docker
```bash
docker build -t ai-video-generator .
docker run -p 3000:3000 -e VALID_API_KEYS=your-key ai-video-generator
```

## API Rate Limits

- **Default**: 60 requests per minute
- **Authenticated**: Unlimited (depends on API key tier)

## License

MIT License