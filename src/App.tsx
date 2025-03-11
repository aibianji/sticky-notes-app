import { useState, useEffect } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import './App.css';

// 添加 Tauri 类型声明
declare global {
  interface Window {
    __TAURI__?: {
      invoke?(cmd: string, args?: Record<string, unknown>): Promise<any>;
    };
    __TAURI_IPC__?: {
      postMessage(message: string): void;
    };
  }
}

// 定义便签类型接口
interface Note {
    id: number;
    content: string;
    screenshot_path: string | null;
    created_at: number;
    updated_at?: number;
    color?: string;
    category_id?: number;
    deleted_at?: number;
}

// 导入便签列表和便签详情组件
export function App() {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [initialized, setInitialized] = useState(false);

    // 检查 Tauri 是否已初始化
    useEffect(() => {
        console.log('组件挂载，准备初始化...');
        // 延迟初始化，确保 DOM 和 Tauri 都准备好
        const timer = setTimeout(() => {
            checkInit();
        }, 300);
        
        return () => clearTimeout(timer);
    }, []);

    // 安全调用 Tauri API
    const safeTauriInvoke = async (cmd: string, args?: Record<string, unknown>) => {
        if (!window.__TAURI__) {
            console.warn('Tauri 全局对象不存在');
            return null;
        }
        
        if (typeof window.__TAURI__.invoke !== 'function') {
            console.warn('Tauri invoke 方法不是函数');
            return null;
        }
        
        try {
            return await window.__TAURI__.invoke(cmd, args);
        } catch (err) {
            console.error(`Tauri 命令 ${cmd} 调用失败:`, err);
            throw err;
        }
    };

    // 初始化检查函数
    const checkInit = async () => {
        console.log('开始初始化检查...');
        try {
            // 判断是否在开发模式
            const isDevelopment = process.env.NODE_ENV === 'development';
            
            if (isDevelopment) {
                console.log('开发模式，使用模拟数据');
                // 创建模拟数据
                setNotes([{
                    id: 1,
                    content: '示例便签 (开发模式)',
                    screenshot_path: null,
                    created_at: Date.now()
                }]);
                setInitialized(true);
                setLoading(false);
                return;
            }
            
            // 尝试调用 Tauri API
            try {
                const result = await safeTauriInvoke('run_app');
                if (result !== null) {
                    console.log('Tauri 初始化成功:', result);
                    setInitialized(true);
                    loadNotes();
                } else {
                    throw new Error('Tauri API 调用返回空值');
                }
            } catch (apiError) {
                console.error('Tauri API 调用失败:', apiError);
                // 在生产环境中，这可能是一个严重错误
                // 在开发环境中，我们可以使用模拟数据
                if (isDevelopment) {
                    console.log('使用开发模式下的备用模拟数据');
                    setNotes([{
                        id: 999,
                        content: '备用模拟便签 (API 调用失败)',
                        screenshot_path: null,
                        created_at: Date.now()
                    }]);
                    setInitialized(true);
                    setLoading(false);
                } else {
                    throw apiError;
                }
            }
        } catch (err) {
            console.error('初始化检查失败:', err);
            setError(`应用初始化失败: ${err instanceof Error ? err.message : String(err)}`);
            setLoading(false);
        }
    };

    // 加载便签数据
    const loadNotes = async () => {
        try {
            setLoading(true);
            const result = await safeTauriInvoke('get_notes');
            console.log('便签数据加载成功:', result);
            
            if (Array.isArray(result)) {
                setNotes(result);
            } else {
                setNotes([]);
                console.warn('便签数据格式不正确:', result);
            }
            
            setLoading(false);
        } catch (err) {
            console.error('加载便签失败:', err);
            setError(`加载便签失败: ${err instanceof Error ? err.message : String(err)}`);
            setLoading(false);
        }
    };

    // 创建新便签
    const createNewNote = async () => {
        try {
            const newNote = {
                content: '新建便签',
                screenshot_path: null,
                created_at: Date.now()
            };

            const result = await safeTauriInvoke('create_note', { note: newNote });
            console.log('新便签创建成功:', result);
            
            // 重新加载便签列表
            loadNotes();
        } catch (err) {
            console.error('创建便签失败:', err);
            setError(`创建便签失败: ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    // 渲染loading状态
    if (loading) {
        return (
            <div className="loading">
                <p>正在加载便签应用...</p>
            </div>
        );
    }

    // 渲染错误状态
    if (error) {
        return (
            <div className="error-container">
                <div className="error-message">
                    <h2>出错了</h2>
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()}>重试</button>
                </div>
            </div>
        );
    }

    // 渲染便签列表
    return (
        <div className="container">
            <h1>我的便签</h1>
            <button onClick={createNewNote}>新建便签</button>
            
            <div className="notes-grid">
                {notes.length === 0 ? (
                    <div className="empty-state">
                        没有便签，点击"新建便签"开始使用
                    </div>
                ) : (
                    notes.map(note => (
                        <div key={note.id} className="note">
                            <div className="note-content">{note.content}</div>
                            <div className="note-footer">
                                {new Date(note.created_at).toLocaleString()}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
} 