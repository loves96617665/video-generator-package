/**
 * Frontend Application - Video/Image Generation Logic
 * Chinese (Traditional) version
 */

const API_BASE_URL = window.location.origin;
let currentMode = 't2v';
let currentModel = null;
let uploadedImageFile = null;
let pollingActive = false;

// Initialize application
async function init() {
    await loadModels();
    setupEventListeners();
    loadApiKey();
}

// Load models from API
async function loadModels() {
    try {
        const response = await fetch(API_BASE_URL + '/api/models');
        const data = await response.json();
        if (data.success) {
            populateModelSelect(data.data);
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('載入模型失敗', 'danger');
    }
}

function populateModelSelect(modelsData) {
    const select = document.getElementById('modelSelect');
    const videoModels = modelsData.video || [];
    select.innerHTML = '';

    videoModels.forEach(function (model) {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name;
        select.appendChild(option);
    });

    if (videoModels.length > 0) {
        select.value = videoModels[0].id;
        updateModelBadge(videoModels[0].id);
    }
}

function updateModelBadge(modelId) {
    const badge = document.getElementById('modelBadge');
    if (modelId === 'ltx-2-5' || modelId === 'wan2-2-fast') {
        badge.textContent = '快速';
        badge.className = 'model-badge badge-fast';
    } else if (modelId === 'ltx-2-3' || modelId === 'minimax-h3') {
        badge.textContent = '高品質';
        badge.className = 'model-badge badge-quality';
    } else {
        badge.textContent = 'NEW';
        badge.className = 'model-badge badge-new';
    }
}

function setupEventListeners() {
    document.querySelectorAll('[data-mode]').forEach(function (tab) {
        tab.addEventListener('click', function (e) {
            switchMode(e.target.getAttribute('data-mode'));
        });
    });

    document.getElementById('durationSlider').addEventListener('input', function (e) {
        document.getElementById('durationValue').textContent = e.target.value;
    });
    document.getElementById('stepsSlider').addEventListener('input', function (e) {
        document.getElementById('stepsValue').textContent = e.target.value;
    });
    document.getElementById('guidanceSlider').addEventListener('input', function (e) {
        document.getElementById('guidanceValue').textContent = e.target.value;
    });
    document.getElementById('modelSelect').addEventListener('change', function (e) {
        updateModelBadge(e.target.value);
    });

    const uploadArea = document.getElementById('imageUploadArea');
    const fileInput = document.getElementById('imageFileInput');
    uploadArea.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', handleImageUpload);
    uploadArea.addEventListener('dragover', function (e) {
        e.preventDefault();
        uploadArea.classList.add('border-primary');
    });
    uploadArea.addEventListener('dragleave', function (e) {
        e.preventDefault();
        uploadArea.classList.remove('border-primary');
    });
    uploadArea.addEventListener('drop', function (e) {
        e.preventDefault();
        uploadArea.classList.remove('border-primary');
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            handleImageUpload(e);
        }
    });
}

function switchMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.nav-link').forEach(function (link) {
        link.classList.remove('active');
    });
    document.querySelector('[data-mode="' + mode + '"]').classList.add('active');

    const section = document.getElementById('imageUploadSection');
    if (mode === 'i2v') {
        section.classList.remove('d-none');
    } else {
        section.classList.add('d-none');
        uploadedImageFile = null;
        document.getElementById('imagePreview').classList.add('d-none');
    }
    document.getElementById('generateBtn').innerHTML = '<i class="fas fa-play me-2"></i>生成';
}

function setAspectRatio(ratio) {
    showNotification('已選擇長寬比: ' + ratio, 'success');
}

function handleImageUpload(e) {
    const fileInput = document.getElementById('imageFileInput');
    const file = fileInput.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showNotification('請上傳有效的圖片檔案', 'danger');
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        showNotification('圖片檔案大小不能超過 10MB', 'danger');
        return;
    }

    uploadedImageFile = file;
    const reader = new FileReader();
    reader.onload = function (event) {
        document.getElementById('previewImg').src = event.target.result;
        document.getElementById('imagePreview').classList.remove('d-none');
    };
    reader.readAsDataURL(file);
}

function removeUploadedImage() {
    uploadedImageFile = null;
    document.getElementById('imageFileInput').value = '';
    document.getElementById('imagePreview').classList.add('d-none');
}

function saveApiKey() {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    if (apiKey) {
        localStorage.setItem('apiKey', apiKey);
        showNotification('API 金鑰已儲存', 'success');
    } else {
        showNotification('請輸入 API 金鑰', 'warning');
    }
}

function loadApiKey() {
    const savedKey = localStorage.getItem('apiKey');
    if (savedKey) {
        document.getElementById('apiKeyInput').value = savedKey;
    }
}

function getApiKey() {
    return localStorage.getItem('apiKey');
}

function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onload = function () { resolve(reader.result); };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Main generate function
async function generateVideo() {
    const prompt = document.getElementById('promptInput').value.trim();
    const modelId = document.getElementById('modelSelect').value;
    const duration = parseInt(document.getElementById('durationSlider').value);
    const steps = parseInt(document.getElementById('stepsSlider').value);
    const guidance = parseFloat(document.getElementById('guidanceSlider').value);

    if (!prompt && currentMode !== 'img') {
        showNotification('請輸入提示詞', 'warning');
        return;
    }
    if (!modelId) {
        showNotification('請選擇模型', 'warning');
        return;
    }

    const btn = document.getElementById('generateBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>生成中...';

    const outputArea = document.getElementById('outputArea');
    outputArea.innerHTML = '<div class="output-placeholder"><i class="fas fa-spinner fa-2x text-primary"></i><p class="mt-3">正在生成中，請稍候...</p><p class="text-muted">這可能需要幾分鐘時間。</p></div>';

    try {
        const apiKey = getApiKey();
        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) headers['X-API-Key'] = apiKey;

        let response;
        if (currentMode === 't2v') {
            response = await fetch(API_BASE_URL + '/api/generate/video/text', {
                method: 'POST', headers: headers,
                body: JSON.stringify({ modelId, prompt, duration, steps, guidance, seed: -1, aspectRatio: '16:9' })
            });
        } else if (currentMode === 'i2v') {
            if (!uploadedImageFile) {
                showNotification('請上傳圖片', 'warning');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-play me-2"></i>生成';
                return;
            }
            const base64 = await fileToBase64(uploadedImageFile);
            response = await fetch(API_BASE_URL + '/api/generate/video/image', {
                method: 'POST', headers: headers,
                body: JSON.stringify({ modelId, prompt, imageUrl: base64, duration, steps, guidance, seed: -1, aspectRatio: '16:9' })
            });
        } else {
            response = await fetch(API_BASE_URL + '/api/generate/image', {
                method: 'POST', headers: headers,
                body: JSON.stringify({ modelId, prompt, width: 1024, height: 1024, steps, guidance, seed: -1 })
            });
        }

        const result = await response.json();
        if (result.success) {
            startPolling(result.jobId);
        } else {
            showNotification(result.error || '生成失敗', 'danger');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-redo me-2"></i>重新生成';
            showError();
        }
    } catch (error) {
        showNotification('生成錯誤: ' + error.message, 'danger');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-redo me-2"></i>重新生成';
        showError();
    }
}

// Polling function for job status
function startPolling(jobId) {
    pollingActive = true;
    let attempts = 0;
    const maxAttempts = 90;
    const pollInterval = 2000;

    const poll = async function () {
        if (!pollingActive) return;
        attempts++;

        try {
            const response = await fetch(API_BASE_URL + '/api/status/' + jobId);
            const result = await response.json();

            if (result.status === 'completed') {
                pollingActive = false;
                const res = await fetch(API_BASE_URL + '/api/result/' + jobId);
                const finalResult = await res.json();
                const url = finalResult.videoUrl || finalResult.previewUrl || finalResult.imageUrl;
                showOutput(url, currentMode);
                showNotification('生成完成！', 'success');
            } else if (result.status === 'failed' || result.status === 'timeout') {
                pollingActive = false;
                showNotification('生成失敗或超時', 'danger');
                showError();
            } else {
                showProgress(result.progress || 0, result.status || 'generating');
                if (attempts < maxAttempts) {
                    setTimeout(poll, pollInterval);
                } else {
                    pollingActive = false;
                    showNotification('生成超時，請嘗試降低參數', 'warning');
                    showError();
                }
            }
        } catch (error) {
            if (attempts < 10) {
                setTimeout(poll, pollInterval);
            } else {
                pollingActive = false;
                showNotification('連線錯誤，請檢查網路', 'danger');
                showError();
            }
        }
    };

    setTimeout(poll, pollInterval);
}

function showProgress(progress, status) {
    const outputArea = document.getElementById('outputArea');
    let statusText = '生成中...';
    if (status === 'queued') statusText = '排隊中...';
    else if (status === 'processing') statusText = '處理中...';
    else if (status === 'connecting') statusText = '連接中...';

    outputArea.innerHTML = '<div class="progress-area">' +
        '<div class="gen-pct">' + progress + '% 完成</div>' +
        '<div class="progress" style="height: 12px; border-radius: 6px; overflow: hidden;">' +
        '<div class="progress-bar bg-primary progress-bar-striped progress-bar-animated" role="progressbar" style="width: ' + progress + '%;"></div></div>' +
        '<div class="status-badge mt-2"><i class="fas fa-spinner fa-spin"></i> ' + statusText + '</div>' +
        '<p class="text-muted mt-2">這可能需要幾分鐘時間，請勿關閉頁面。</p></div>';
}

function showOutput(videoUrl, mode) {
    const outputArea = document.getElementById('outputArea');
    const btn = document.getElementById('generateBtn');

    if (mode === 'img') {
        outputArea.innerHTML = '<div class="text-center">' +
            '<img src="' + videoUrl + '" alt="生成結果" id="outputImage" style="max-width: 100%; max-height: 480px; border-radius: 12px;">' +
            '<div class="mt-3">' +
            '<a href="' + videoUrl + '" target="_blank" class="btn btn-outline-primary btn-sm">預覽</a> ' +
            '<button class="btn btn-primary btn-sm" onclick="downloadImage(\'' + videoUrl + '\')"><i class="fas fa-download"></i> 下載</button>' +
            '</div></div>';
    } else {
        outputArea.innerHTML = '<div class="text-center">' +
            '<video id="outputVideo" controls style="max-width: 100%; max-height: 480px; border-radius: 12px;">' +
            '<source src="' + videoUrl + '" type="video/mp4">您的瀏覽器不支援影片播放。</video>' +
            '<div class="mt-3">' +
            '<a href="' + videoUrl + '" target="_blank" class="btn btn-outline-primary btn-sm">預覽</a> ' +
            '<button class="btn btn-primary btn-sm" onclick="downloadVideo(\'' + videoUrl + '\')"><i class="fas fa-download"></i> 下載</button>' +
            '</div></div>';
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-redo me-2"></i>重新生成';
}

function showError() {
    const outputArea = document.getElementById('outputArea');
    outputArea.innerHTML = '<div class="output-placeholder">' +
        '<i class="fas fa-exclamation-triangle fa-2x text-danger mb-2"></i>' +
        '<p>生成失敗，請稍後再試或更換模型。</p>' +
        '<button class="btn btn-outline-primary btn-sm mt-2" onclick="init()">' +
        '<i class="fas fa-redo"></i> 重新開始</button></div>';
}

function downloadVideo(url) {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated-video.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function downloadImage(url) {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated-image.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function showNotification(message, type) {
    type = type || 'info';
    const notification = document.createElement('div');
    notification.className = 'alert alert-' + type + ' alert-dismissible fade show position-fixed top-0 end-0 m-3';
    notification.style.cssText = 'z-index: 10000; max-width: 400px;';
    notification.innerHTML = message + '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>';
    document.body.appendChild(notification);

    setTimeout(function () {
        notification.classList.remove('show');
        setTimeout(function () {
            if (notification.parentNode) notification.parentNode.removeChild(notification);
        }, 300);
    }, 5000);
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);