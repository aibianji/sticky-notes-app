import React, { useState, useEffect } from 'react';
import { Note } from '../lib/api';
import { NoteEditor } from './NoteEditor';
import { Window } from '@tauri-apps/api/window';
import WindowManager from '../lib/window';

interface NoteWindowProps {
    note: Note;
    onClose: () => void;
}

interface WindowSize {
    width: number;
    height: number;
}

export function NoteWindow({ note, onClose }: NoteWindowProps) {
    const [windowSize, setWindowSize] = useState<WindowSize>({ width: 300, height: 400 });

    useEffect(() => {
        const windowManager = WindowManager.getInstance();
        const window = Window.getCurrent();

        // 监听窗口大小变化
        const unlistenResize = window.onResized(({ payload: { width, height } }: { payload: WindowSize }) => {
            setWindowSize({ width, height });
        });

        // 注册到窗口管理器
        windowManager.createNoteWindow(note, {
            width: windowSize.width,
            height: windowSize.height,
        });

        return () => {
            unlistenResize.then((unlisten: () => void) => unlisten());
            windowManager.closeNoteWindow(note.id);
        };
    }, [note, windowSize.width, windowSize.height]);

    // 处理窗口关闭
    const handleClose = async () => {
        const windowManager = WindowManager.getInstance();
        await windowManager.closeNoteWindow(note.id);
        onClose();
    };

    return (
        <div 
            className="h-screen w-screen bg-transparent"
            style={{
                width: windowSize.width,
                height: windowSize.height,
            }}
        >
            <NoteEditor 
                note={note} 
                onClose={handleClose}
            />
        </div>
    );
} 