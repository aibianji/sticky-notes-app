import React from 'react';
import ReactDOM from 'react-dom/client';
import { invoke } from '@tauri-apps/api/tauri';
import { App } from './App';
import './styles.css';

// 声明 window.__TAURI__ 类型
declare global {
  interface Window {
    __TAURI__?: {
      invoke(cmd: string, args?: Record<string, unknown>): Promise<any>;
    };
    __TAURI_IPC__?: {
      postMessage(message: string): void;
    };
  }
}

async function init(): Promise<void> {
    try {
        // 等待 DOM 加载完成
        if (document.readyState !== 'complete') {
            await new Promise(resolve => {
                window.addEventListener('load', resolve);
            });
        }

        // 等待 Tauri 初始化
        let retries = 0;
        const maxRetries = 20; // 增加重试次数
        const retryInterval = 1000; // 增加重试间隔到1秒

        while (retries < maxRetries) {
            try {
                // 尝试调用一个简单的命令来验证 Tauri 是否可用
                await invoke('run_app');
                console.log('Tauri 初始化成功');
                break;
            } catch (err) {
                console.log(`等待 Tauri 初始化... (尝试 ${retries + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, retryInterval));
                retries++;
                
                if (retries === maxRetries) {
                    throw new Error('Tauri 初始化超时');
                }
            }
        }

        // 渲染应用
        const rootElement = document.getElementById('root');
        if (!rootElement) {
            throw new Error('找不到根元素');
        }

        console.log('开始渲染应用...');
        ReactDOM.createRoot(rootElement).render(
            <React.StrictMode>
                <App />
            </React.StrictMode>
        );
    } catch (err) {
        console.error('应用初始化失败:', err);
        const rootElement = document.getElementById('root');
        if (rootElement) {
            rootElement.innerHTML = `
                <div style="padding: 20px; text-align: center;">
                    <h2 style="color: #e53e3e; margin-bottom: 20px;">应用初始化失败</h2>
                    <p style="margin-bottom: 15px;">请尝试以下步骤：</p>
                    <ol style="text-align: left; display: inline-block; margin-bottom: 20px;">
                        <li style="margin-bottom: 10px;">关闭应用并重新启动</li>
                        <li style="margin-bottom: 10px;">检查是否以管理员身份运行</li>
                        <li style="margin-bottom: 10px;">检查防火墙设置</li>
                    </ol>
                    <p style="color: #666; margin-bottom: 20px;">
                        错误信息: ${err instanceof Error ? err.message : String(err)}
                    </p>
                    <button 
                        onclick="window.location.reload()" 
                        style="
                            background-color: #4299e1;
                            color: white;
                            padding: 8px 16px;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            transition: background-color 0.2s;
                        "
                        onmouseover="this.style.backgroundColor='#3182ce'"
                        onmouseout="this.style.backgroundColor='#4299e1'"
                    >
                        刷新页面
                    </button>
                </div>
            `;
        }
    }
}

init(); 