document.addEventListener('DOMContentLoaded', function() {
    const inputData = document.getElementById('inputData');
    const outputData = document.getElementById('outputData');
    const transformBtn = document.getElementById('transformBtn');
    const clearBtn = document.getElementById('clearBtn');
    const copyBtn = document.getElementById('copyBtn');
    const toolButtons = document.querySelectorAll('.tool-btn');
    
    let currentTool = 'json';
    
    // 工具按钮点击事件
    toolButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            currentTool = this.dataset.type;
            
            // 更新按钮状态
            toolButtons.forEach(b => b.style.background = 'rgba(255, 255, 255, 0.1)');
            this.style.background = 'rgba(102, 126, 234, 0.3)';
            
            // 根据工具类型更新输入框提示
            updatePlaceholder();
        });
    });
    
    function updatePlaceholder() {
        const placeholders = {
            json: '在这里输入 JSON 数据...',
            base64: '输入要编码或解码的 Base64 数据...',
            url: '输入要编码或解码的 URL...',
            html: '输入要转义或反转义的 HTML...',
            timestamp: '输入时间戳或日期字符串...'
        };
        inputData.placeholder = placeholders[currentTool] || '在这里输入要转换的数据...';
    }
    
    // 转换按钮点击事件
    transformBtn.addEventListener('click', function() {
        const input = inputData.value.trim();
        if (!input) {
            showOutput('请输入要转换的数据', 'error');
            return;
        }
        
        try {
            let result;
            switch (currentTool) {
                case 'json':
                    result = formatJSON(input);
                    break;
                case 'base64':
                    result = handleBase64(input);
                    break;
                case 'url':
                    result = handleURL(input);
                    break;
                case 'html':
                    result = handleHTML(input);
                    break;
                case 'timestamp':
                    result = handleTimestamp(input);
                    break;
                default:
                    result = '未支持的转换类型';
            }
            showOutput(result, 'success');
        } catch (error) {
            showOutput('转换失败: ' + error.message, 'error');
        }
    });
    
    // 清空按钮
    clearBtn.addEventListener('click', function() {
        inputData.value = '';
        outputData.innerHTML = '<p class="placeholder">转换结果将显示在这里...</p>';
    });
    
    // 复制按钮
    copyBtn.addEventListener('click', function() {
        const text = outputData.textContent;
        if (text && !text.includes('转换结果将显示在这里')) {
            navigator.clipboard.writeText(text).then(() => {
                alert('结果已复制到剪贴板！');
            });
        }
    });
    
    // 显示输出结果
    function showOutput(content, type) {
        const isError = type === 'error';
        outputData.innerHTML = `<pre style="color: ${isError ? '#ff6b6b' : '#64ffda'}; white-space: pre-wrap;">${content}</pre>`;
    }
    
    // JSON 格式化
    function formatJSON(input) {
        try {
            const parsed = JSON.parse(input);
            return JSON.stringify(parsed, null, 2);
        } catch {
            // 如果不是有效的JSON，尝试修复常见问题
            try {
                const fixed = input.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":');
                const parsed = JSON.parse(fixed);
                return JSON.stringify(parsed, null, 2);
            } catch (e) {
                throw new Error('无效的 JSON 格式');
            }
        }
    }
    
    // Base64 处理
    function handleBase64(input) {
        // 检查是否是Base64编码
        if (/^[A-Za-z0-9+/]*={0,2}$/.test(input)) {
            try {
                return decodeURIComponent(escape(atob(input)));
            } catch {
                return atob(input);
            }
        } else {
            return btoa(unescape(encodeURIComponent(input)));
        }
    }
    
    // URL 处理
    function handleURL(input) {
        if (input.includes('%')) {
            return decodeURIComponent(input);
        } else {
            return encodeURIComponent(input);
        }
    }
    
    // HTML 处理
    function handleHTML(input) {
        if (/&[#\w]+;/.test(input)) {
            // 包含HTML实体，进行反转义
            const textarea = document.createElement('textarea');
            textarea.innerHTML = input;
            return textarea.value;
        } else {
            // 进行HTML转义
            return input
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }
    }
    
    // 时间戳转换
    function handleTimestamp(input) {
        let timestamp;
        
        // 检查是否是数字时间戳
        if (/^\d+$/.test(input)) {
            timestamp = input.length === 10 ? parseInt(input) * 1000 : parseInt(input);
        } else {
            // 尝试解析日期字符串
            timestamp = new Date(input).getTime();
            if (isNaN(timestamp)) {
                throw new Error('无效的时间戳或日期格式');
            }
        }
        
        const date = new Date(timestamp);
        const localTime = date.toLocaleString();
        const utcTime = date.toUTCString();
        
        return `本地时间: ${localTime}\nUTC 时间: ${utcTime}\n时间戳(ms): ${timestamp}\n时间戳(s): ${Math.floor(timestamp / 1000)}`;
    }
    
    // 初始化
    updatePlaceholder();
});
