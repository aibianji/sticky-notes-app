import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

interface ShortcutSettingsProps {
    shortcuts: {
        new_note: string;
        screenshot: string;
    };
    onUpdate: (shortcuts: { new_note: string; screenshot: string }) => void;
}

export function ShortcutSettings({ shortcuts, onUpdate }: ShortcutSettingsProps) {
    const [newNoteShortcut, setNewNoteShortcut] = useState(shortcuts.new_note);
    const [screenshotShortcut, setScreenshotShortcut] = useState(shortcuts.screenshot);
    const [recording, setRecording] = useState<'new_note' | 'screenshot' | null>(null);
    const [error, setError] = useState<string | null>(null);

    // 记录按键组合
    const handleKeyDown = useCallback(async (e: KeyboardEvent) => {
        if (!recording) return;

        e.preventDefault();
        
        const modifiers = [];
        if (e.ctrlKey) modifiers.push('Control');
        if (e.shiftKey) modifiers.push('Shift');
        if (e.altKey) modifiers.push('Alt');
        if (e.metaKey) modifiers.push('Command');

        // 获取主键
        let key = e.key;
        if (key === ' ') key = 'Space';
        if (key.length === 1) key = key.toUpperCase();
        if (key === 'Control' || key === 'Shift' || key === 'Alt' || key === 'Meta') return;

        const shortcut = [...modifiers, key].join('+');

        try {
            // 检查快捷键是否可用
            const isAvailable = await invoke<boolean>('check_shortcut', { shortcut });
            
            if (!isAvailable) {
                setError(`快捷键 ${shortcut} 已被其他程序占用`);
                return;
            }

            // 更新快捷键
            if (recording === 'new_note') {
                setNewNoteShortcut(shortcut);
            } else {
                setScreenshotShortcut(shortcut);
            }
            
            setError(null);
            setRecording(null);

        } catch (err) {
            setError(err as string);
        }
    }, [recording]);

    // 保存快捷键设置
    const handleSave = async () => {
        try {
            await invoke('update_shortcuts', {
                newNote: newNoteShortcut,
                screenshot: screenshotShortcut,
            });
            
            onUpdate({
                new_note: newNoteShortcut,
                screenshot: screenshotShortcut,
            });
            
            setError(null);
        } catch (err) {
            setError(err as string);
        }
    };

    useEffect(() => {
        if (recording) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [recording, handleKeyDown]);

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4">快捷键设置</h2>
            
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
                    {error}
                </div>
            )}

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <span>新建便签：</span>
                    <div className="flex items-center space-x-2">
                        <button
                            className={`px-4 py-2 border rounded ${
                                recording === 'new_note'
                                    ? 'bg-blue-100 border-blue-500'
                                    : 'hover:bg-gray-50'
                            }`}
                            onClick={() => setRecording('new_note')}
                        >
                            {recording === 'new_note' ? '请按下快捷键...' : newNoteShortcut}
                        </button>
                        <button
                            className="text-gray-500 hover:text-gray-700"
                            onClick={() => setNewNoteShortcut(shortcuts.new_note)}
                        >
                            重置
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <span>截图：</span>
                    <div className="flex items-center space-x-2">
                        <button
                            className={`px-4 py-2 border rounded ${
                                recording === 'screenshot'
                                    ? 'bg-blue-100 border-blue-500'
                                    : 'hover:bg-gray-50'
                            }`}
                            onClick={() => setRecording('screenshot')}
                        >
                            {recording === 'screenshot' ? '请按下快捷键...' : screenshotShortcut}
                        </button>
                        <button
                            className="text-gray-500 hover:text-gray-700"
                            onClick={() => setScreenshotShortcut(shortcuts.screenshot)}
                        >
                            重置
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex justify-end space-x-2 mt-4">
                <button
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    onClick={handleSave}
                >
                    保存
                </button>
            </div>

            <div className="text-sm text-gray-500 mt-4">
                <p>提示：</p>
                <ul className="list-disc list-inside">
                    <li>点击快捷键按钮后，按下新的快捷键组合</li>
                    <li>支持的修饰键：Control、Shift、Alt、Command</li>
                    <li>支持的主键：字母、数字、F1-F12、方向键等</li>
                </ul>
            </div>
        </div>
    );
} 