import { invoke } from '@tauri-apps/api/tauri';

export interface Note {
    id: number;
    content: string;
    screenshot_path?: string;
    created_at: number;
    color?: string;
    category_id?: number;
}

export interface Category {
    id: number;
    name: string;
    color: string;
    sort_order: number;
}

export async function getNotes(): Promise<Note[]> {
    return invoke<Note[]>('get_notes');
}

export async function getNotesByCategory(categoryId: number): Promise<Note[]> {
    return invoke<Note[]>('get_notes_by_category', { categoryId });
}

export async function addNote(content: string, screenshot_path?: string, category_id?: number): Promise<number> {
    return invoke<number>('add_note', { content, screenshot_path, category_id });
}

export async function updateNote(id: number, content: string): Promise<void> {
    return invoke<void>('update_note', { id, content });
}

export async function updateNoteColor(id: number, color: string): Promise<void> {
    return invoke<void>('update_note_color', { id, color });
}

export async function updateNoteCategory(id: number, category_id: number | null): Promise<void> {
    return invoke<void>('update_note_category', { id, category_id });
}

export async function deleteNote(id: number): Promise<void> {
    return invoke<void>('delete_note', { id });
}

export async function getCategories(): Promise<Category[]> {
    return invoke<Category[]>('get_categories');
}

export async function addCategory(name: string, color: string): Promise<number> {
    return invoke<number>('add_category', { name, color });
}

export async function updateCategory(id: number, name: string, color: string): Promise<void> {
    return invoke<void>('update_category', { id, name, color });
}

export async function deleteCategory(id: number): Promise<void> {
    return invoke<void>('delete_category', { id });
}

export async function updateCategoryOrder(id: number, newOrder: number): Promise<void> {
    return invoke<void>('update_category_order', { id, newOrder });
}

// 防抖函数
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
} 