import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './App.css';

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

    // 初始化检查
    useEffect(() => {
        let mounted = true;
        let retryCount = 0;
        const maxRetries = 5;

        const checkInit = async () => {
            try {
                console.log('开始初始化检查...');
                
                // 尝试调用一个简单的命令来验证 Tauri 是否可用
                await invoke('run_app');
                console.log('Tauri 初始化成功');
                
                if (mounted) {
                    setInitialized(true);
                    setError(null);
                }
            } catch (err) {
                console.error('初始化检查失败:', err);
                retryCount++;
                
                if (retryCount < maxRetries && mounted) {
                    console.log(`重试初始化 (${retryCount}/${maxRetries})...`);
                    setTimeout(checkInit, 1000); // 等待1秒后重试
                } else if (mounted) {
                    setError(`应用初始化失败: ${err instanceof Error ? err.message : String(err)}`);
                }
            }
        };

        console.log('组件挂载，准备初始化...');
        checkInit();

        return () => {
            mounted = false;
        };
    }, []);

    // 加载便签数据
    const loadNotes = async () => {
        if (!initialized) return;

        try {
            setLoading(true);
            setError(null);

            console.log('开始加载便签...');
            const allNotes = await invoke<Note[]>('get_notes');
            console.log('便签加载结果:', allNotes);
            
            setNotes(Array.isArray(allNotes) ? allNotes : []);
        } catch (err) {
            console.error('加载便签失败:', err);
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(`加载便签失败: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    // 当初始化完成后加载便签数据
    useEffect(() => {
        if (initialized) {
            loadNotes();
        }
    }, [initialized]);

    // 创建新便签
    const createNewNote = async () => {
        if (!initialized) return;

        try {
            const newNote = await invoke<Note>('add_note', {
                content: '新建便签',
                screenshot_path: null
            });

            if (newNote) {
                setNotes(prev => [...prev, newNote]);
            }
        } catch (err) {
            console.error('创建便签失败:', err);
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(`创建便签失败: ${errorMessage}`);
        }
    };

    if (!initialized) {
        return <div className="loading">正在初始化应用...</div>;
    }

    if (loading) {
        return <div className="loading">正在加载便签...</div>;
    }

    if (error) {
        return (
            <div className="error-container">
                <div className="error-message">
                    <h2>出错了</h2>
                    <p>{error}</p>
                    <button onClick={() => {
                        setError(null);
                        loadNotes();
                    }}>
                        重试
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <h1>我的便签</h1>
            <button onClick={createNewNote}>新建便签</button>
            <div className="notes-grid">
                {notes.length === 0 ? (
                    <div className="empty-state">暂无便签</div>
                ) : (
                    notes.map(note => (
                        <div key={note.id} className="note">
                            <div className="note-content">{note.content}</div>
                            <div className="note-footer">
                                <span>{new Date(note.created_at * 1000).toLocaleString()}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
} 