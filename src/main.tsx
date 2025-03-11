import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

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
    const maxRetries = 10;
    
    while (!window.__TAURI__ && retries < maxRetries) {
      console.log(`等待 Tauri 初始化... (尝试 ${retries + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 500));
      retries++;
    }

    if (!window.__TAURI__) {
      throw new Error('Tauri 初始化超时');
    }

    console.log('Tauri 初始化成功');

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
    // 显示错误信息
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="padding: 20px; color: red;">
          <h2>应用初始化失败</h2>
          <p>请尝试以下步骤：</p>
          <ol>
            <li>关闭应用并重新启动</li>
            <li>检查是否以管理员身份运行</li>
            <li>检查防火墙设置</li>
          </ol>
          <p>错误信息: ${err instanceof Error ? err.message : String(err)}</p>
          <button onclick="window.location.reload()">刷新页面</button>
        </div>
      `;
    }
  }
}

init(); 