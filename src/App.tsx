import { useState, useEffect } from 'react';
import { notesApi, systemApi } from './lib/tauri-api';
import './App.css';

// 添加 Tauri 类型声明
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
    const [retryCount, setRetryCount] = useState(0);
    const maxRetries = 3;

    // 检查 Tauri 是否已初始化
    useEffect(() => {
        console.log('组件挂载，准备初始化...');
        checkInit();
    }, []);

    // 初始化检查函数
    const checkInit = async () => {
        console.log('开始初始化检查...');
        try {
            const initialized = await systemApi.checkInit();
            if (!initialized) {
                throw new Error('应用初始化失败');
            }
            console.log('Tauri 初始化成功');
            setInitialized(true);
            setError(null);
            loadNotes();
        } catch (err) {
            console.error('初始化检查失败:', err);
            setRetryCount(prev => {
                const newCount = prev + 1;
                if (newCount < maxRetries) {
                    console.log(`重试初始化 (${newCount}/${maxRetries})...`);
                    setTimeout(checkInit, 2000); // 增加重试间隔时间
                } else {
                    setError(`应用初始化失败: ${err instanceof Error ? err.message : String(err)}`);
                    setLoading(false);
                }
                return newCount;
            });
        }
    };

    // 加载便签数据
    const loadNotes = async () => {
        if (!initialized) {
            console.log('应用未初始化，跳过加载便签');
            return;
        }

        try {
            setLoading(true);
            const result = await notesApi.getAllNotes();
            console.log('便签数据加载成功:', result);
            setNotes(result);
        } catch (err) {
            console.error('加载便签失败:', err);
            setError(`加载便签失败: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setLoading(false);
        }
    };

    // 创建新便签
    const createNewNote = async () => {
        if (!initialized) {
            console.log('应用未初始化，无法创建便签');
            return;
        }

        try {
            const newNote = {
                content: '新建便签',
                screenshot_path: null,
                created_at: Date.now()
            };

            const result = await notesApi.addNote(newNote);
            if (result) {
                console.log('新便签创建成功:', result);
                loadNotes(); // 重新加载便签列表
            } else {
                throw new Error('创建便签失败');
            }
        } catch (err) {
            console.error('创建便签失败:', err);
            setError(`创建便签失败: ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    // 阻止默认右键菜单
    useEffect(() => {
        const handleContextMenu = async (e: MouseEvent) => {
            e.preventDefault();
            if (initialized) {
                try {
                    await systemApi.checkInit();
                } catch (err) {
                    console.error('处理右键菜单失败:', err);
                }
            }
        };

        document.addEventListener('contextmenu', handleContextMenu);
        return () => document.removeEventListener('contextmenu', handleContextMenu);
    }, [initialized]);

    // 渲染loading状态
    if (loading) {
        return (
            <div className="loading">
                <p>正在加载便签应用...</p>
                {retryCount > 0 && <p>重试次数: {retryCount}/{maxRetries}</p>}
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
                    <button onClick={() => {
                        setRetryCount(0);
                        setError(null);
                        setLoading(true);
                        checkInit();
                    }}>重试</button>
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