import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Note, updateNote } from '../lib/api';
import { debounce } from '../lib/api';
import { invoke } from '@tauri-apps/api/tauri';
import { message } from '@tauri-apps/api/dialog';

interface NoteEditorProps {
    note: Note;
    onClose: () => void;
    onSave: () => void;
    onDelete: (id: number) => void;
}

const COLORS = [
    { name: '白色', value: '#FFFFFF' },
    { name: '黄色', value: '#FFF9C4' },
    { name: '粉色', value: '#F8BBD0' },
    { name: '蓝色', value: '#BBDEFB' },
    { name: '绿色', value: '#C8E6C9' },
    { name: '紫色', value: '#E1BEE7' },
    { name: '橙色', value: '#FFE0B2' },
];

export function NoteEditor({ note, onClose, onSave, onDelete }: NoteEditorProps) {
    const [content, setContent] = useState(note.content);
    const [isSaving, setIsSaving] = useState(false);
    const [color, setColor] = useState(note.color || '#FFFFFF');
    const [showColorPicker, setShowColorPicker] = useState(false);
    const editorRef = useRef<HTMLTextAreaElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // 自动保存（带防抖）
    const saveNote = useCallback(
        debounce(async (content: string) => {
            setIsSaving(true);
            try {
                await updateNote(note.id, content);
            } catch (error) {
                console.error('Failed to save note:', error);
            } finally {
                setIsSaving(false);
            }
        }, 500),
        [note.id]
    );

    // 更新便签颜色
    const updateNoteColor = async (newColor: string) => {
        try {
            await invoke('update_note_color', {
                id: note.id,
                color: newColor,
            });
            setColor(newColor);
            setShowColorPicker(false);
        } catch (err) {
            console.error('Failed to update note color:', err);
            await message('更新便签颜色失败', { title: '错误', type: 'error' });
        }
    };

    // 内容变化时触发自动保存
    useEffect(() => {
        if (content !== note.content) {
            saveNote(content);
        }
    }, [content, note.content, saveNote]);

    useEffect(() => {
        setContent(note.content);
    }, [note.content]);

    // 处理粘贴事件
    const handlePaste = async (e: React.ClipboardEvent) => {
        e.preventDefault();

        // 获取剪贴板中的图片
        const items = e.clipboardData.items;
        let imageItem = null;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                imageItem = items[i];
                break;
            }
        }

        if (imageItem) {
            try {
                // 将图片转换为 File 对象
                const file = imageItem.getAsFile();
                if (!file) return;

                // 读取图片数据
                const reader = new FileReader();
                reader.onload = async (e) => {
                    if (!e.target?.result) return;

                    try {
                        // 保存图片
                        const imagePath = await invoke<string>('save_pasted_image', {
                            imageData: e.target.result,
                        });

                        // 在光标位置插入图片标记
                        const textarea = editorRef.current;
                        if (!textarea) return;

                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const newValue = 
                            content.substring(0, start) +
                            `![图片](${imagePath})` +
                            content.substring(end);

                        setContent(newValue);
                        saveNote(newValue);

                        // 更新光标位置
                        setTimeout(() => {
                            textarea.selectionStart = textarea.selectionEnd = 
                                start + imagePath.length + 9;
                        }, 0);

                    } catch (err) {
                        console.error('Failed to save image:', err);
                        await message('图片保存失败', { title: '错误', type: 'error' });
                    }
                };
                reader.readAsDataURL(file);

            } catch (err) {
                console.error('Failed to process pasted image:', err);
                await message('处理粘贴图片失败', { title: '错误', type: 'error' });
            }
        } else {
            // 处理文本粘贴
            const text = e.clipboardData.getData('text');
            const textarea = editorRef.current;
            if (!textarea) return;

            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newValue = 
                content.substring(0, start) +
                text +
                content.substring(end);

            setContent(newValue);
            saveNote(newValue);

            // 更新光标位置
            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = 
                    start + text.length;
            }, 0);
        }
    };

    // 处理拖放
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length > 0) {
            try {
                for (const file of imageFiles) {
                    // 使用 FileReader 读取文件内容
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        if (!e.target?.result) return;

                        try {
                            // 保存图片
                            const imagePath = await invoke<string>('save_pasted_image', {
                                imageData: e.target.result,
                            });

                            // 在光标位置插入图片标记
                            const textarea = editorRef.current;
                            if (!textarea) return;

                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const newValue = 
                                content.substring(0, start) +
                                `![图片](${imagePath})` +
                                content.substring(end);

                            setContent(newValue);
                            saveNote(newValue);

                            // 更新光标位置
                            setTimeout(() => {
                                textarea.selectionStart = textarea.selectionEnd = 
                                    start + imagePath.length + 9;
                            }, 0);
                        } catch (err) {
                            console.error('Failed to save image:', err);
                            await message('图片保存失败', { title: '错误', type: 'error' });
                        }
                    };
                    reader.readAsDataURL(file);
                }
            } catch (err) {
                console.error('Failed to process dropped image:', err);
                await message('处理拖放图片失败', { title: '错误', type: 'error' });
            }
        }
    };

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            await updateNote(note.id, content);
            onSave();
        } catch (err) {
            console.error('Failed to save note:', err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div 
            className="flex flex-col h-full rounded-lg shadow-lg overflow-hidden"
            style={{ backgroundColor: color }}
        >
            {/* 标题栏 */}
            <div className="flex justify-between items-center px-4 py-2 bg-opacity-10 bg-gray-500 cursor-move"
                 data-tauri-drag-region>
                <div className="flex items-center space-x-2">
                    <div className="text-sm text-gray-500">
                        {new Date(note.created_at * 1000).toLocaleString()}
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            className="w-6 h-6 rounded border border-gray-300 focus:outline-none"
                            style={{ backgroundColor: color }}
                        />
                        {showColorPicker && (
                            <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded shadow-lg z-10">
                                <div className="grid grid-cols-4 gap-1">
                                    {COLORS.map((c) => (
                                        <button
                                            key={c.value}
                                            onClick={() => updateNoteColor(c.value)}
                                            className="w-6 h-6 rounded border border-gray-300 focus:outline-none"
                                            style={{ backgroundColor: c.value }}
                                            title={c.name}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={() => onDelete(note.id)}
                        className="px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                    >
                        删除
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                        {isSaving ? '保存中...' : '保存'}
                    </button>
                    <button
                        onClick={onClose}
                        className="px-3 py-1 hover:bg-gray-100 rounded"
                    >
                        关闭
                    </button>
                </div>
            </div>

            {/* 编辑区域 */}
            <div className="flex-1 p-4">
                <div 
                    className={`relative w-full h-full ${
                        isDragging ? 'bg-blue-50 bg-opacity-50' : ''
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <textarea
                        ref={editorRef}
                        value={content}
                        onChange={(e) => {
                            setContent(e.target.value);
                            saveNote(e.target.value);
                        }}
                        onPaste={handlePaste}
                        className="w-full h-full p-4 resize-none focus:outline-none bg-transparent"
                        placeholder="输入便签内容..."
                        autoFocus
                    />
                    {isDragging && (
                        <div className="absolute inset-0 flex items-center justify-center bg-blue-100 bg-opacity-50">
                            <div className="text-blue-500 text-lg">
                                释放鼠标以添加图片
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 截图预览（如果有） */}
            {note.screenshot_path && (
                <div className="p-4 border-t border-opacity-10 border-gray-500">
                    <img
                        src={`file://${note.screenshot_path}`}
                        alt="Screenshot"
                        className="max-w-full h-auto rounded"
                    />
                </div>
            )}

            {/* 保存状态指示器 */}
            <div className="px-4 py-2 text-xs text-gray-500 bg-opacity-10 bg-gray-500 border-t border-opacity-10 border-gray-500">
                {isSaving ? '保存中...' : '已保存'}
            </div>
        </div>
    );
} 