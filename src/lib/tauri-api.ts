// 导入 Tauri API
import { invoke } from '@tauri-apps/api/tauri';

// 定义便签类型
export interface Note {
    id: number;
    content: string;
    screenshot_path: string | null;
    created_at: number;
    updated_at?: number;
    color?: string;
    category_id?: number;
    deleted_at?: number;
}

// 定义设置类型
export interface Settings {
    dbPath: string;
    isEncrypted: boolean;
    startWithSystem: boolean;
    theme: 'light' | 'dark' | 'system';
    shortcuts: {
        newNote: string;
        screenshot: string;
    };
}

// 定义内存使用情况类型
export interface MemoryUsage {
    usedMB: number;
    totalMB: number;
    percentUsed: number;
}

// 便签相关API
export const notesApi = {
    // 获取所有便签
    getAllNotes: async (): Promise<Note[]> => {
        try {
            return await invoke<Note[]>("get_notes");
        } catch (error) {
            console.error('获取便签列表失败:', error);
            return [];
        }
    },

    // 添加便签
    addNote: async (note: Omit<Note, 'id'>): Promise<Note | null> => {
        try {
            return await invoke<Note>("add_note", { note });
        } catch (error) {
            console.error('创建便签失败:', error);
            return null;
        }
    },

    // 更新便签
    updateNote: async (note: Note): Promise<boolean> => {
        try {
            await invoke("update_note", { note });
            return true;
        } catch (error) {
            console.error('更新便签失败:', error);
            return false;
        }
    },

    // 删除便签
    deleteNote: async (noteId: number): Promise<boolean> => {
        try {
            await invoke("delete_note", { noteId });
            return true;
        } catch (error) {
            console.error('删除便签失败:', error);
            return false;
        }
    },

    // 搜索便签
    searchNotes: async (query: string): Promise<Note[]> => {
        try {
            return await invoke<Note[]>("search_notes", { query });
        } catch (error) {
            console.error('搜索便签失败:', error);
            return [];
        }
    },
};

// 系统相关API
export const systemApi = {
    // 初始化检查
    checkInit: async (): Promise<boolean> => {
        try {
            const result = await invoke<string>("run_app");
            return result === "App initialized successfully";
        } catch (error) {
            console.error('应用初始化失败:', error);
            return false;
        }
    },

    // 获取内存使用情况
    getMemoryUsage: async (): Promise<MemoryUsage | null> => {
        try {
            return await invoke<MemoryUsage>("get_memory_usage");
        } catch (error) {
            console.error('获取内存使用情况失败:', error);
            return null;
        }
    },

    // 截图
    takeScreenshot: async (): Promise<string | null> => {
        try {
            const result = await invoke<{ path: string }>("take_screenshot");
            return result.path;
        } catch (error) {
            console.error('截图失败:', error);
            return null;
        }
    },

    // 获取设置
    getSettings: async (): Promise<Settings | null> => {
        try {
            return await invoke<Settings>("get_settings");
        } catch (error) {
            console.error('获取设置失败:', error);
            return null;
        }
    },

    // 保存设置
    saveSettings: async (settings: Settings): Promise<boolean> => {
        try {
            await invoke("save_settings", { settings });
            return true;
        } catch (error) {
            console.error('保存设置失败:', error);
            return false;
        }
    },

    // 退出应用
    exitApp: async (): Promise<void> => {
        try {
            await invoke("exit_app");
        } catch (error) {
            console.error('退出应用失败:', error);
            // 如果退出失败，可以尝试强制退出
            window.close();
        }
    },
}; 