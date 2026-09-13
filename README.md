# AI Video Generator Platform (Cloudflare Workers)

A professional AI video generation platform supporting Text-to-Video, Image-to-Video, and Image generation with multi-model support and API key authentication. Built natively for Cloudflare Workers.

## Features

- 📽️ **Text-to-Video Generation** - Create videos from text descriptions
- 🖼️ **Image-to-Video Generation** - Generate videos from images
- 🎨 **Image Generation** - Generate images from text prompts
- 🔑 **API Key Authentication** - Secure API access with API keys
- ⚡ **Multi-Model Support** - Multiple video and image generation models
- 📊 **Progress Tracking** - Real-time generation progress
- 🚀 **Cloudflare Workers Native** - No external dependencies, runs on edge
- 🌐 **Web Interface** - Professional web UI for interactive generation

## Project Structure

```
video-generator-package/
├── public/                    # Static assets for web interface
│   ├── index.html            # Main web page
│   ├── styles.css            # CSS styles
│   ├── app.js                # Frontend JavaScript logic
│   ├── favicon.svg           # SVG favicon
│   └── favicon-32x32.png     # PNG favicon
├── src/
│   ├── index.js              # Cloudflare Workers entry point
│   ├── models.js             # Model configuration manager
│   └── generator.js          # Video/image generation handler
├── wrangler.toml             # Cloudflare Workers configuration
├── package.json              # NPM configuration
└── README.md                 # This file
```

## Supported Models

### Video Models
| Model ID | Name | Type | Resolution | Steps |
|----------|------|------|------------|-------|
| ltx-2-5 | LTX Video 2.5 Distilled | T2V/I2V | 1472x832 | 11 |
| ltx-2-3 | LTX Video 2.3 | T2V/I2V | 1536x1024 | 10 |
| minimax-h3 | MiniMax H3 | T2V/I2V | 960x544 | 28 |
| wan2-2-fast | Wan 2.2 Fast | T2V/I2V | 832x480 | 4-20 |
| omni-video-factory | Omni Video Factory | T2V/I2V | 512x288 | 3 |
| ltx-2-3-f2lf | LTX-2.3 First-Last Frame | T2V/I2V | 1536x1024 | 10 |

### Image Models
| Model ID | Name | Provider |
|----------|------|----------|
| gptimage2 | GPT Image 2 | OpenAI |
| flux-2 | Flux 2 AI | Black Forest Labs |
| seedream-4 | Seedream 4.0 | Samsung SDS |
| qwen-image | Qwen Image | Alibaba |
| nano-banana | Nano Banana AI | Unknown |

## API Endpoints

### Authentication
```
X-API-Key: your-api-key
```

Or use Bearer token:
```
Authorization: Bearer your-token
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
  "modelId": "ltx-2-5",
  "prompt": "Add flowing water to this image",
  "imageUrl": "data:image/png;base64,...",
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

## Environment Variables (Cloudflare Secrets)

```bash
# Set API keys
wrangler secret put VALID_API_KEYS
# Enter: key1,key2,key3

# Set JWT tokens
wrangler secret put VALID_TOKENS
# Enter: token1,token2
```

## Local Development

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn
- Cloudflare account

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

This will start the local development server at `http://localhost:8787`

### Local Testing with API

You can test the API without authentication in development mode:

```bash
# Health check
curl http://localhost:8787/health

# Get models
curl http://localhost:8787/api/models

# Test video generation
curl -X POST http://localhost:8787/api/generate/video/text \
  -H "Content-Type: application/json" \
  -d '{"modelId": "ltx-2-5", "prompt": "A beautiful sunset over mountains"}'
```

## Deployment

### Deploy to Cloudflare Workers
```bash
# Login to Cloudflare
wrangler login

# Deploy
npm run deploy
```

### Set Secrets (API Keys)
```bash
# Set API keys
wrangler secret put VALID_API_KEYS

# Set JWT tokens (optional)
wrangler secret put VALID_TOKENS
```

### Custom Domain (Optional)
Add your custom domain to `wrangler.toml`:
```toml
routes = [
  { pattern = "yourdomain.com/*", zone_id = "your-zone-id" }
]
```

## Frontend Interface

The web interface is available at `/` after deployment.

### Features
- Model selection dropdown
- Generation mode toggle (Text-to-Video, Image-to-Video, Image Generation)
- Parameter controls (duration, steps, guidance scale)
- Aspect ratio selection
- API key storage (local only, not sent to server)
- Progress tracking
- Video/image preview and download

## API Rate Limits

- **Default**: 60 requests per minute
- **Authenticated**: Unlimited (depends on API key tier)

## Architecture

```
src/
├── index.js       # Cloudflare Workers entry point
├── models.js      # Model configuration manager
└── generator.js   # Video/image generation handler
```

## License

MIT License