/**
 * Frontend Application Logic
 * Handles API communication, form interactions, and video generation
 */

// Configuration
const API_BASE_URL = window.location.origin;

// Application State
let currentMode = 't2v';
let currentModel = null;
let uploadedImageFile = null;

// Initialize application
async function init() {
    await loadModels();
    setupEventListeners();
    loadApiKey();
}

// Load available models from API
async function loadModels() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/models`);
        const data = await response.json();

        if (data.success) {
            populateModelSelect(data.data);
        }
    } catch (error) {
        console.error('Error loading models:', error);
        showNotification('載入模型失敗', 'danger');
    }
}

// Populate model select dropdown
function populateModelSelect(modelsData) {
    const select = document.getElementById('modelSelect');
    const videoModels = modelsData.video || [];

    // Clear existing options
    select.innerHTML = '';

    // Add video models for T2V/I2V modes
    videoModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name;
        option.dataset.provider = model.provider;
        select.appendChild(option);
    });

    // Set default model
    if (videoModels.length > 0) {
        select.value = videoModels[0].id;
        updateModelBadge(videoModels[0]);
    }
}

// Update model badge with provider info
function updateModelBadge(model) {
    const badge = document.getElementById('modelBadge');
    if (model && model.provider) {
        badge.textContent = model.provider;
        badge.className = 'model-badge badge-info';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Mode tabs
    document.querySelectorAll('[data-mode]').forEach(tab => {
        tab.addEventListener('click', (e) => {
            switchMode(e.target.getAttribute('data-mode'));
        });
    });

    // Slider value updates
    document.getElementById('durationSlider').addEventListener('input', (e) => {
        document.getElementById('durationValue').textContent = e.target.value;
    });

    document.getElementById('stepsSlider').addEventListener('input', (e) => {
        document.getElementById('stepsValue').textContent = e.target.value;
    });

    document.getElementById('guidanceSlider').addEventListener('input', (e) => {
        document.getElementById('guidanceValue').textContent = e.target.value;
    });

    // Image upload area
    const uploadArea = document.getElementById('imageUploadArea');
    const fileInput = document.getElementById('imageFileInput');

    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleImageUpload);

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('border-primary');
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('border-primary');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('border-primary');
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            handleImageUpload(e);
        }
    });
}

// Switch between generation modes
function switchMode(mode) {
    currentMode = mode;

    // Update active tab
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-mode="${mode}"]`).classList.add('active');

    // Show/hide image upload section
    const imageUploadSection = document.getElementById('imageUploadSection');
    if (mode === 'i2v') {
        imageUploadSection.classList.remove('d-none');
    } else {
        imageUploadSection.classList.add('d-none');
        uploadedImageFile = null;
        document.getElementById('imagePreview').classList.add('d-none');
    }

    // Update button text
    document.getElementById('generateBtn').innerHTML = '<i class="fas fa-play me-2"></i>生成';
}

// Set aspect ratio
function setAspectRatio(ratio) {
    console.log('Selected aspect ratio:', ratio);
}

// Handle image upload
function handleImageUpload(e) {
    const fileInput = document.getElementById('imageFileInput');
    const file = fileInput.files[0];

    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showNotification('請上傳有效的圖片檔案', 'danger');
        return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
        showNotification('圖片檔案大小不能超過 10MB', 'danger');
        return;
    }

    uploadedImageFile = file;

    // Preview image
    const reader = new FileReader();
    reader.onload = (e) => {
        const previewImg = document.getElementById('previewImg');
        previewImg.src = e.target.result;
        document.getElementById('imagePreview').classList.remove('d-none');
    };
    reader.readAsDataURL(file);
}

// Remove uploaded image
function removeUploadedImage() {
    uploadedImageFile = null;
    document.getElementById('imageFileInput').value = '';
    document.getElementById('imagePreview').classList.add('d-none');
}

// Save API key
function saveApiKey() {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    if (apiKey) {
        localStorage.setItem('apiKey', apiKey);
        showNotification('API Key 已儲存', 'success');
    }
}

// Load saved API key
function loadApiKey() {
    const savedKey = localStorage.getItem('apiKey');
    if (savedKey) {
        document.getElementById('apiKeyInput').value = savedKey;
    }
}

// Get API key from localStorage
function getApiKey() {
    return localStorage.getItem('apiKey');
}

// Generate video/image
async function generateVideo() {
    const prompt = document.getElementById('promptInput').value.trim();
    const modelId = document.getElementById('modelSelect').value;
    const duration = parseInt(document.getElementById('durationSlider').value);
    const steps = parseInt(document.getElementById('stepsSlider').value);
    const guidance = parseFloat(document.getElementById('guidanceSlider').value);

    // Validate prompt
    if (!prompt && currentMode !== 'img') {
        showNotification('請輸入提示詞', 'warning');
        return;
    }

    if (!modelId) {
        showNotification('請選擇模型', 'warning');
        return;
    }

    // Show loading state
    const btn = document.getElementById('generateBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>生成中...';

    // Clear output
    const outputArea = document.getElementById('outputArea');
    outputArea.innerHTML = '<div class="output-placeholder"><div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;"></div><p class="mt-3">正在生成中，請稍候...</p></div>';

    try {
        let response;
        const apiKey = getApiKey();
        const headers = {
            'Content-Type': 'application/json'
        };

        if (apiKey) {
            headers['X-API-Key'] = apiKey;
        }

        if (currentMode === 't2v') {
            // Text to Video
            response = await fetch(`${API_BASE_URL}/api/generate/video/text`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    modelId,
                    prompt,
                    duration,
                    steps,
                    guidance,
                    seed: -1,
                    aspectRatio: '16:9'
                })
            });
        } else if (currentMode === 'i2v') {
            // Image to Video
            if (!uploadedImageFile) {
                showNotification('請上傳圖片', 'warning');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-play me-2"></i>生成';
                return;
            }

            // Convert image to base64 and upload
            const formData = new FormData();
            formData.append('image', uploadedImageFile);

            // For simplicity, use base64 approach
            const base64 = await fileToBase64(uploadedImageFile);

            response = await fetch(`${API_BASE_URL}/api/generate/video/image`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    modelId,
                    prompt,
                    imageUrl: base64,
                    duration,
                    steps,
                    guidance,
                    seed: -1,
                    aspectRatio: '16:9'
                })
            });
        } else {
            // Image Generation
            response = await fetch(`${API_BASE_URL}/api/generate/image`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    modelId,
                    prompt,
                    width: 1024,
                    height: 1024,
                    steps,
                    guidance,
                    seed: -1
                })
            });
        }

        const result = await response.json();

        if (result.success) {
            // Poll for result
            pollForResult(result.jobId);
        } else {
            showNotification(result.error || '生成失敗', 'danger');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-play me-2"></i>生成';
        }
    } catch (error) {
        console.error('Generation error:', error);
        showNotification('生成失敗: ' + error.message, 'danger');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-play me-2"></i>生成';
    }
}

// Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Poll for generation result
async function pollForResult(jobId) {
    const outputArea = document.getElementById('outputArea');
    const btn = document.getElementById('generateBtn');
    let attempts = 0;
    const maxAttempts = 60;

    const poll = async () => {
        attempts++;

        try {
            const response = await fetch(`${API_BASE_URL}/api/status/${jobId}`);
            const result = await response.json();

            if (result.status === 'completed') {
                // Get the result
                const resultResponse = await fetch(`${API_BASE_URL}/api/result/${jobId}`);
                const finalResult = await resultResponse.json();

                showOutput(finalResult.videoUrl || finalResult.previewUrl, currentMode);
                showNotification('生成完成！', 'success');
            } else if (result.status === 'failed' || result.status === 'timeout') {
                showNotification('生成失敗或超時', 'danger');
                showError();
            } else {
                // Update progress
                const progress = result.progress || 0;
                showProgress(progress);

                if (attempts < maxAttempts) {
                    setTimeout(poll, 2000);
                } else {
                    showNotification('生成超時', 'warning');
                    showError();
                }
            }
        } catch (error) {
            console.error('Polling error:', error);
            if (attempts < maxAttempts) {
                setTimeout(poll, 2000);
            }
        }
    };

    setTimeout(poll, 2000);
}

// Show video output
function showOutput(videoUrl, mode) {
    const outputArea = document.getElementById('outputArea');
    const btn = document.getElementById('generateBtn');

    if (mode === 'img') {
        outputArea.innerHTML = `
            <div class="text-center">
                <img src="${videoUrl}" alt="生成結果" id="outputImage">
                <div class="mt-3">
                    <a href="${videoUrl}" target="_blank" class="btn btn-outline-primary btn-sm">預覽大圖</a>
                    <button class="btn btn-primary btn-sm" onclick="downloadImage('${videoUrl}')">
                        <i class="fas fa-download"></i> 下載
                    </button>
                </div>
            </div>
        `;
    } else {
        outputArea.innerHTML = `
            <div class="text-center">
                <video id="outputVideo" controls>
                    <source src="${videoUrl}" type="video/mp4">
                    您的瀏覽器不支援影片播放。
                </video>
                <div class="mt-3">
                    <a href="${videoUrl}" target="_blank" class="btn btn-outline-primary btn-sm">預覽大檔</a>
                    <button class="btn btn-primary btn-sm" onclick="downloadVideo('${videoUrl}')">
                        <i class="fas fa-download"></i> 下載
                    </button>
                </div>
            </div>
        `;
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-redo me-2"></i>重新生成';
}

// Show progress
function showProgress(progress) {
    const outputArea = document.getElementById('outputArea');
    outputArea.innerHTML = `
        <div class="progress-area">
            <div class="gen-pct">${progress}% 完成</div>
            <div class="progress" style="height: 12px; border-radius: 6px; overflow: hidden;">
                <div class="progress-bar bg-primary" role="progressbar" style="width: ${progress}%;"></div>
            </div>
            <div class="status-badge mt-2">
                <i class="fas fa-spinner fa-spin"></i> 生成中...
            </div>
        </div>
    `;
}

// Show error
function showError() {
    const outputArea = document.getElementById('outputArea');
    outputArea.innerHTML = `
        <div class="output-placeholder">
            <i class="fas fa-exclamation-triangle fa-2x text-danger mb-2"></i>
            <p>生成失敗，請稍後再試或更換不同的模型。</p>
            <button class="btn btn-outline-primary btn-sm mt-2" onclick="init()">
                <i class="fas fa-redo"></i> 重新開始
            </button>
        </div>
    `;
}

// Download video
function downloadVideo(url) {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated-video.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Download image
function downloadImage(url) {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated-image.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    notification.style.cssText = 'z-index: 10000; max-width: 400px;';
    notification.innerHTML = message + '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="關閉"></button>';

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);