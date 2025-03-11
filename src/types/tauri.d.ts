declare module '@tauri-apps/api/tauri' {
    export function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T>;
}

declare module '@tauri-apps/api/dialog' {
    export function message(
        message: string,
        options?: {
            title?: string;
            type?: 'info' | 'warning' | 'error';
            okLabel?: string;
            cancelLabel?: string;
        }
    ): Promise<boolean>;
}

declare module '@tauri-apps/api/store' {
    export class Store {
        constructor(path: string);
        set(key: string, value: unknown): Promise<void>;
        get<T>(key: string): Promise<T | null>;
    }
} 