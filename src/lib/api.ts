import { invoke } from '@tauri-apps/api/tauri';

// 类型定义
export interface Note {
    id: number;
    content: string;
    screenshot_path?: string;
    created_at: number;
    updated_at?: number;
    is_pinned: boolean;
    color?: string;
    category_id?: number;
    deleted_at?: number;
}

export interface NoteReminder {
    id: number;
    note_id: number;
    reminder_time: number;
    completed: boolean;
}

export interface Category {
    id: number;
    name: string;
    color?: string;
}

// 数据库初始化
export async function initDatabase(): Promise<boolean> {
    return invoke('init_database');
}

// 便签相关 API
export async function createNote(
    content: string, 
    screenshot_path?: string, 
    category_id?: number
): Promise<number> {
    return invoke('create_note', { content, screenshot_path, category_id });
}

export async function updateNote(
    id: number, 
    content: string, 
    screenshot_path?: string,
    is_pinned: boolean = false,
    color?: string,
    category_id?: number
): Promise<boolean> {
    return invoke('update_note', { 
        id, 
        content, 
        screenshot_path,
        is_pinned,
        color,
        category_id
    });
}

export async function getNoteById(id: number): Promise<Note | null> {
    return invoke('get_note_by_id', { id });
}

export async function getNotesSorted(
    limit?: number, 
    offset?: number, 
    search?: string
): Promise<Note[]> {
    return invoke('get_notes_sorted', { 
        limit: limit ? limit : null, 
        offset: offset ? offset : null,
        search: search ? search : null
    });
}

export async function toggleNotePin(id: number): Promise<boolean> {
    return invoke('toggle_note_pin', { id });
}

export async function moveNotesToTrash(ids: number[]): Promise<number> {
    return invoke('move_notes_to_trash', { ids });
}

export async function restoreNotesFromTrash(ids: number[]): Promise<number> {
    return invoke('restore_notes_from_trash', { ids });
}

export async function permanentlyDeleteNotes(ids: number[]): Promise<number> {
    return invoke('permanently_delete_notes', { ids });
}

export async function getTrashNotes(): Promise<Note[]> {
    return invoke('get_trash_notes');
}

export async function cleanupTrash(days: number = 30): Promise<number> {
    return invoke('cleanup_trash', { days });
}

// 提醒相关 API
export async function addReminder(note_id: number, reminder_time: number): Promise<number> {
    return invoke('add_reminder', { note_id, reminder_time });
}

export async function updateReminder(
    id: number, 
    reminder_time: number,
    completed: boolean = false
): Promise<boolean> {
    return invoke('update_reminder', { id, reminder_time, completed });
}

export async function deleteReminder(id: number): Promise<boolean> {
    return invoke('delete_reminder', { id });
}

export async function getRemindersByNote(note_id: number): Promise<NoteReminder[]> {
    return invoke('get_reminders_by_note', { note_id });
}

export async function getUpcomingReminders(limit?: number): Promise<[NoteReminder, Note][]> {
    return invoke('get_upcoming_reminders', { 
        limit: limit ? limit : null 
    });
}

// 分类相关 API
export async function createCategory(name: string, color?: string): Promise<number> {
    return invoke('create_category', { name, color });
}

export async function updateCategory(id: number, name: string, color?: string): Promise<boolean> {
    return invoke('update_category', { id, name, color });
}

export async function deleteCategory(id: number): Promise<boolean> {
    return invoke('delete_category', { id });
}

export async function getAllCategories(): Promise<Category[]> {
    return invoke('get_all_categories');
}

// 防抖函数
export function debounce<T extends (...args: any[]) => void>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            timeout = null;
            func(...args);
        };

        if (timeout) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(later, wait);
    };
}

// 搜索便签
export async function searchNotes(query: string, categoryId: number | null): Promise<Note[]> {
    return await invoke('search_notes', { query, categoryId });
} 