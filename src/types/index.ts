// 便签类型定义
export interface Note {
    id: number;
    content: string;
    screenshot_path: string | null;
    created_at: number;
    updated_at?: number;
    color?: string;
    category_id?: number;
    deleted_at?: number;
    is_pinned?: boolean;
}

// 提醒类型定义
export interface Reminder {
    id: number;
    note_id: number;
    remind_at: number;
    created_at: number;
    updated_at?: number;
    deleted_at?: number;
    title?: string;
    description?: string;
}

// 分类类型定义
export interface Category {
    id: number;
    name: string;
    color?: string;
    created_at: number;
    updated_at?: number;
    deleted_at?: number;
}

// 快捷键映射类型定义
export interface ShortcutMapping {
    id: string;
    command: string;
    shortcut: string;
    description?: string;
}

// 截图数据类型定义
export interface ScreenshotData {
    id: string;
    data: string;
    created_at: number;
    note_id?: number;
} 