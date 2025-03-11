import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Note } from '../types';
import debounce from 'lodash/debounce';

interface NoteEditorProps {
    note: Note;
    onSaved?: () => void;
}

export function NoteEditor({ note, onSaved }: NoteEditorProps) {
    const [content, setContent] = useState(note.content);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 自动保存功能
    const saveNote = useCallback(
        debounce(async (content: string) => {
            setIsSaving(true);
            try {
                await invoke('update_note', {
                    id: note.id,
                    content,
                    updatedAt: Math.floor(Date.now() / 1000)
                });
                setError(null);
                onSaved?.();
            } catch (err) {
                console.error('保存便签失败:', err);
                setError('保存失败');
            } finally {
                setIsSaving(false);
            }
        }, 500),
        [note.id, onSaved]
    );

    // 内容变化时自动保存
    useEffect(() => {
        if (content !== note.content) {
            saveNote(content);
        }
    }, [content, note.content, saveNote]);

    // 组件卸载时取消未完成的保存
    useEffect(() => {
        return () => {
            saveNote.cancel();
        };
    }, [saveNote]);

    return (
        <div className="note-editor">
            {error && (
                <div className="error-message">
                    <p>{error}</p>
                    <button onClick={() => saveNote(content)}>重试</button>
                </div>
            )}
            
            <div className="editor-status">
                {isSaving && <span className="saving-indicator">正在保存...</span>}
            </div>
            
            <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="在此输入便签内容..."
                className="note-content-editor"
                autoFocus
            />
        </div>
    );
} 