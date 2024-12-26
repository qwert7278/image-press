document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const comparisonContainer = document.getElementById('comparisonContainer');
    const originalPreview = document.getElementById('originalPreview');
    const compressedPreview = document.getElementById('compressedPreview');
    const originalSize = document.getElementById('originalSize');
    const compressedSize = document.getElementById('compressedSize');
    const originalDimensions = document.getElementById('originalDimensions');
    const compressedDimensions = document.getElementById('compressedDimensions');
    const qualitySlider = document.getElementById('quality');
    const qualityValue = document.getElementById('qualityValue');
    const compressBtn = document.getElementById('compressBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const startBatchBtn = document.getElementById('startBatchBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');

    let originalFile = null;
    let imageQueue = [];
    let processedCount = 0;

    // 拖放上传
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#007AFF';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#c7c7c7';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#c7c7c7';
        handleFiles(e.dataTransfer.files);
    });

    // 点击上传
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // 质量滑块
    qualitySlider.addEventListener('input', (e) => {
        qualityValue.textContent = `${e.target.value}%`;
    });

    // 压缩按钮
    compressBtn.addEventListener('click', () => {
        if (originalFile) {
            compressImage(originalFile, qualitySlider.value / 100);
        }
    });

    // 添加批量处理按钮事件
    startBatchBtn.addEventListener('click', async () => {
        if (imageQueue.length === 0) {
            alert('請先上傳圖片！');
            return;
        }
        
        startBatchBtn.disabled = true;
        startBatchBtn.textContent = '處理中...';
        
        try {
            await compressImages();
        } catch (error) {
            console.error('批量處理失敗:', error);
            alert('處理過程中發生錯誤，請重試！');
        } finally {
            startBatchBtn.disabled = false;
            startBatchBtn.textContent = '開始批量處理';
        }
    });

    // 添加清除全部按钮事件
    clearAllBtn.addEventListener('click', () => {
        imageQueue = [];
        processedCount = 0;
        document.getElementById('imagesGrid').innerHTML = '';
        document.getElementById('batchProgress').style.display = 'none';
        document.getElementById('imagesList').style.display = 'none';
        document.getElementById('progressBar').style.width = '0%';
        document.getElementById('progressText').textContent = '0/0';
    });

    // 处理上传的文件
    function handleFiles(files) {
        imageQueue = Array.from(files).filter(file => file.type.startsWith('image/'));
        
        if (imageQueue.length === 0) {
            alert('請上傳圖片檔案！');
            return;
        }

        // 重置進度條
        document.getElementById('batchProgress').style.display = 'block';
        document.getElementById('progressText').textContent = `0/${imageQueue.length}`;
        document.getElementById('progressBar').style.width = '0%';

        // 顯示圖片列表
        const imagesList = document.getElementById('imagesList');
        const imagesGrid = document.getElementById('imagesGrid');
        imagesGrid.innerHTML = '';
        
        imageQueue.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = 'image-item';
                div.innerHTML = `
                    <div class="image-checkbox">
                        <input type="checkbox" id="img-${index}" checked>
                    </div>
                    <img src="${e.target.result}" alt="預覽圖片 ${index + 1}">
                    <div class="info">
                        <p>名稱: ${file.name}</p>
                        <p>大小: ${formatFileSize(file.size)}</p>
                    </div>
                `;
                imagesGrid.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
        
        imagesList.style.display = 'block';
        
        // 添加全選按鈕（如果還沒有的話）
        if (!document.querySelector('.batch-actions button.secondary-button')) {
            addSelectAllButton();
        }
    }

    // 压缩图片
    async function compressImages() {
        setLoading(true);
        try {
            processedCount = 0;
            const quality = qualitySlider.value / 100;
            const compressedFiles = [];

            for (const [index, file] of imageQueue.entries()) {
                try {
                    const compressedBlob = await compressImageAsync(file, quality);
                    compressedFiles.push({
                        name: file.name,
                        blob: compressedBlob,
                        index: index
                    });
                    
                    processedCount++;
                    updateProgress();
                    
                    // 更新預覽圖的壓縮後大小
                    const infoDiv = document.querySelector(`#img-${index}`).closest('.image-item').querySelector('.info');
                    infoDiv.innerHTML += `<p class="compressed-size">壓縮後: ${formatFileSize(compressedBlob.size)}</p>`;
                } catch (error) {
                    console.error('壓縮失敗:', error);
                }
            }

            // 顯示下載按鈕
            const downloadAllBtn = document.createElement('button');
            downloadAllBtn.className = 'primary-button';
            downloadAllBtn.textContent = '下載已選擇的圖片';
            downloadAllBtn.onclick = () => downloadSelected(compressedFiles);
            document.querySelector('.batch-actions').appendChild(downloadAllBtn);
        } catch (error) {
            console.error('批量處理失敗:', error);
            alert('處理過程中發生錯誤，請重試！');
        } finally {
            setLoading(false);
        }
    }

    // 更新進度條
    function updateProgress() {
        const progress = (processedCount / imageQueue.length) * 100;
        document.getElementById('progressBar').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = 
            `${processedCount}/${imageQueue.length}`;
    }

    // 簡化壓縮函數，只保留基本壓縮功能
    function compressImageAsync(file, quality) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, file.type, quality);
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    // 格式化文件大小
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 添加下載選中圖片的函數
    async function downloadSelected(compressedFiles) {
        const selectedIndexes = Array.from(document.querySelectorAll('.image-checkbox input:checked'))
            .map(checkbox => parseInt(checkbox.id.split('-')[1]));
        
        if (selectedIndexes.length === 0) {
            alert('請選擇要下載的圖片！');
            return;
        }

        const zip = new JSZip();
        selectedIndexes.forEach(index => {
            const file = compressedFiles.find(f => f.index === index);
            if (file) {
                zip.file(file.name, file.blob);
            }
        });

        const zipBlob = await zip.generateAsync({type: 'blob'});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = 'compressed_images.zip';
        link.click();
    }

    // 統一使用 compressImageAsync 函數
    async function compressImage(file, quality) {
        try {
            const compressedBlob = await compressImageAsync(file, quality);
            const img = new Image();
            img.onload = () => {
                compressedPreview.src = URL.createObjectURL(compressedBlob);
                compressedSize.textContent = formatFileSize(compressedBlob.size);
                compressedDimensions.textContent = `${img.width} x ${img.height}`;
                
                downloadBtn.disabled = false;
                downloadBtn.onclick = () => {
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(compressedBlob);
                    link.download = `compressed_${file.name}`;
                    link.click();
                };
            };
            img.src = URL.createObjectURL(compressedBlob);
        } catch (error) {
            console.error('壓縮失敗:', error);
            alert('圖片處理失敗，請重試！');
        }
    }

    // 添加全選功能
    function addSelectAllButton() {
        const selectAllBtn = document.createElement('button');
        selectAllBtn.className = 'secondary-button';
        selectAllBtn.textContent = '全選';
        selectAllBtn.onclick = toggleSelectAll;
        document.querySelector('.batch-actions').insertBefore(selectAllBtn, clearAllBtn);
    }

    function toggleSelectAll() {
        const checkboxes = document.querySelectorAll('.image-checkbox input');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        checkboxes.forEach(cb => cb.checked = !allChecked);
        this.textContent = allChecked ? '全選' : '取消全選';
    }

    // 添加載入狀態處理
    function setLoading(isLoading) {
        startBatchBtn.disabled = isLoading;
        clearAllBtn.disabled = isLoading;
        qualitySlider.disabled = isLoading;
        startBatchBtn.textContent = isLoading ? '處理中...' : '開始批量處理';
    }
}); 