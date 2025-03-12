import { invoke } from '@tauri-apps/api/tauri';

interface ImportMetaEnv {
    DEV: boolean;
    PROD: boolean;
    MODE: string;
}

interface ImportMeta {
    env: ImportMetaEnv;
}

// 日志级别
export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR'
}

class Logger {
    private static instance: Logger;
    private isDevelopment: boolean;

    private constructor() {
        this.isDevelopment = process.env.NODE_ENV === 'development';
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private async log(level: LogLevel, message: string, ...args: any[]) {
        const formattedMessage = `[${level}] ${message}`;
        
        // 开发环境下在控制台输出
        if (this.isDevelopment) {
            switch (level) {
                case LogLevel.DEBUG:
                    console.debug(formattedMessage, ...args);
                    break;
                case LogLevel.INFO:
                    console.info(formattedMessage, ...args);
                    break;
                case LogLevel.WARN:
                    console.warn(formattedMessage, ...args);
                    break;
                case LogLevel.ERROR:
                    console.error(formattedMessage, ...args);
                    break;
            }
        }

        try {
            // 将日志发送到 Rust 后端
            await invoke('log_message', {
                level,
                message,
                args: args.map(arg => String(arg))
            });
        } catch (error) {
            // 如果发送到后端失败，确保在开发环境下至少能看到错误
            if (this.isDevelopment) {
                console.error('Failed to send log to backend:', error);
            }
        }
    }

    public async debug(message: string, ...args: any[]) {
        await this.log(LogLevel.DEBUG, message, ...args);
    }

    public async info(message: string, ...args: any[]) {
        await this.log(LogLevel.INFO, message, ...args);
    }

    public async warn(message: string, ...args: any[]) {
        await this.log(LogLevel.WARN, message, ...args);
    }

    public async error(message: string, ...args: any[]) {
        await this.log(LogLevel.ERROR, message, ...args);
    }
}

export const logger = Logger.getInstance(); 