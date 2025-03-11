import { Window as TauriWindow, WindowOptions } from '@tauri-apps/api/window';
import { Event } from '@tauri-apps/api/event';
import { Note } from './api';

const DEFAULT_NOTE_WINDOW_OPTIONS: WindowOptions = {
    width: 300,
    height: 400,
    decorations: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    center: true,
};

class WindowManager {
    private static instance: WindowManager;
    private noteWindows: Map<number, TauriWindow>;

    private constructor() {
        this.noteWindows = new Map();
    }

    public static getInstance(): WindowManager {
        if (!WindowManager.instance) {
            WindowManager.instance = new WindowManager();
        }
        return WindowManager.instance;
    }

    public async createNoteWindow(note: Note, options: Partial<WindowOptions> = {}): Promise<TauriWindow> {
        // 如果窗口已存在，则激活它
        const existingWindow = this.noteWindows.get(note.id);
        if (existingWindow) {
            await existingWindow.show();
            await existingWindow.setFocus();
            return existingWindow;
        }

        // 创建新窗口
        const windowOptions = {
            ...DEFAULT_NOTE_WINDOW_OPTIONS,
            ...options,
            title: `Note-${note.id}`,
            url: `/note/${note.id}`,
        };

        const window = new TauriWindow(`note-${note.id}`, windowOptions);
        this.noteWindows.set(note.id, window);

        // 监听窗口关闭事件
        window.once('tauri://destroyed', () => {
            this.noteWindows.delete(note.id);
        });

        // 监听窗口错误
        window.once('tauri://error', (event: Event<string>) => {
            console.error(`Window error: ${event.payload}`);
            this.noteWindows.delete(note.id);
        });

        return window;
    }

    public async closeNoteWindow(noteId: number): Promise<void> {
        const window = this.noteWindows.get(noteId);
        if (window) {
            await window.close();
            this.noteWindows.delete(noteId);
        }
    }

    public async closeAllWindows(): Promise<void> {
        const closePromises = Array.from(this.noteWindows.values()).map(window => window.close());
        await Promise.all(closePromises);
        this.noteWindows.clear();
    }

    public async minimizeAllWindows(): Promise<void> {
        const minimizePromises = Array.from(this.noteWindows.values()).map(window => window.minimize());
        await Promise.all(minimizePromises);
    }

    public async restoreAllWindows(): Promise<void> {
        const restorePromises = Array.from(this.noteWindows.values()).map(window => window.unminimize());
        await Promise.all(restorePromises);
    }

    public getNoteWindow(noteId: number): TauriWindow | undefined {
        return this.noteWindows.get(noteId);
    }

    public getAllWindows(): TauriWindow[] {
        return Array.from(this.noteWindows.values());
    }

    public getWindowCount(): number {
        return this.noteWindows.size;
    }
}

export default WindowManager; 