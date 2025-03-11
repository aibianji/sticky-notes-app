import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Store } from '@tauri-apps/api/store';
import { message } from '@tauri-apps/api/dialog';
import { ShortcutSettings } from './ShortcutSettings';

interface Settings {
    shortcuts: {
        new_note: string;
        screenshot: string;
    };
    appearance: {
        always_on_top: boolean;
        transparency: number;
        theme: 'light' | 'dark' | 'system';
    };
    security: {
        auto_lock: boolean;
        lock_timeout: number;
        encryption_enabled: boolean;
    };
}

const defaultSettings: Settings = {
    shortcuts: {
        new_note: 'CommandOrControl+Shift+C',
        screenshot: 'CommandOrControl+Shift+X',
    },
    appearance: {
        always_on_top: true,
        transparency: 0.95,
        theme: 'system',
    },
    security: {
        auto_lock: false,
        lock_timeout: 5,
        encryption_enabled: true,
    },
};

export function SettingsPage() {
    const [settings, setSettings] = useState<Settings>(defaultSettings);
    const [store] = useState(new Store('.settings.dat'));
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const savedSettings = await store.get<Settings>('settings');
            if (savedSettings) {
                setSettings(savedSettings);
            }
            setError(null);
        } catch (err) {
            setError('加载设置失败');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleShortcutsUpdate = async (shortcuts: Settings['shortcuts']) => {
        try {
            await invoke('update_shortcuts', {
                newNote: shortcuts.new_note,
                screenshot: shortcuts.screenshot,
            });

            setSettings({
                ...settings,
                shortcuts,
            });
            setError(null);
        } catch (err) {
            setError('更新快捷键失败');
            console.error(err);
        }
    };

    const saveSettings = async (newSettings: Settings) => {
        try {
            await store.set('settings', newSettings);
            setSettings(newSettings);
            await message('设置已保存', { title: '成功' });
        } catch (err) {
            console.error('Failed to save settings:', err);
            await message('保存设置失败', { title: '错误', type: 'error' });
        }
    };

    if (isLoading) {
        return <div className="p-4">加载中...</div>;
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
                    {error}
                </div>
            )}

            <h1 className="text-2xl font-bold mb-6">设置</h1>

            <div className="space-y-8">
                <ShortcutSettings
                    shortcuts={settings.shortcuts}
                    onUpdate={handleShortcutsUpdate}
                />

                {/* 外观设置 */}
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold">外观</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm">总是置顶</label>
                            <input
                                type="checkbox"
                                checked={settings.appearance.always_on_top}
                                onChange={(e) => {
                                    setSettings({
                                        ...settings,
                                        appearance: {
                                            ...settings.appearance,
                                            always_on_top: e.target.checked,
                                        },
                                    });
                                }}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-sm">窗口透明度</label>
                            <input
                                type="range"
                                min="0.5"
                                max="1"
                                step="0.05"
                                value={settings.appearance.transparency}
                                onChange={(e) => {
                                    setSettings({
                                        ...settings,
                                        appearance: {
                                            ...settings.appearance,
                                            transparency: parseFloat(e.target.value),
                                        },
                                    });
                                }}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-sm">主题</label>
                            <select
                                value={settings.appearance.theme}
                                onChange={(e) => {
                                    setSettings({
                                        ...settings,
                                        appearance: {
                                            ...settings.appearance,
                                            theme: e.target.value as Settings['appearance']['theme'],
                                        },
                                    });
                                }}
                                className="px-3 py-1 border rounded"
                            >
                                <option value="light">浅色</option>
                                <option value="dark">深色</option>
                                <option value="system">跟随系统</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* 安全设置 */}
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold">安全</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm">自动锁定</label>
                            <input
                                type="checkbox"
                                checked={settings.security.auto_lock}
                                onChange={(e) => {
                                    setSettings({
                                        ...settings,
                                        security: {
                                            ...settings.security,
                                            auto_lock: e.target.checked,
                                        },
                                    });
                                }}
                            />
                        </div>
                        {settings.security.auto_lock && (
                            <div className="flex items-center justify-between">
                                <label className="text-sm">锁定超时（分钟）</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="60"
                                    value={settings.security.lock_timeout}
                                    onChange={(e) => {
                                        setSettings({
                                            ...settings,
                                            security: {
                                                ...settings.security,
                                                lock_timeout: parseInt(e.target.value),
                                            },
                                        });
                                    }}
                                    className="px-3 py-1 border rounded w-20"
                                />
                            </div>
                        )}
                        <div className="flex items-center justify-between">
                            <label className="text-sm">启用数据加密</label>
                            <input
                                type="checkbox"
                                checked={settings.security.encryption_enabled}
                                onChange={(e) => {
                                    setSettings({
                                        ...settings,
                                        security: {
                                            ...settings.security,
                                            encryption_enabled: e.target.checked,
                                        },
                                    });
                                }}
                            />
                        </div>
                    </div>
                </section>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end space-x-4 mt-8">
                <button
                    onClick={() => setSettings(defaultSettings)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                    重置
                </button>
                <button
                    onClick={() => saveSettings(settings)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    保存
                </button>
            </div>
        </div>
    );
} 