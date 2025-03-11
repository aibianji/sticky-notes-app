import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Reminder } from '../types';
import { message } from '@tauri-apps/api/dialog';

interface ReminderModalProps {
    noteId: number;
    onClose: () => void;
}

export function ReminderModal({ noteId, onClose }: ReminderModalProps) {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 加载提醒列表
    useEffect(() => {
        const loadReminders = async () => {
            try {
                const result = await invoke<Reminder[]>('get_reminders_by_note', { noteId });
                setReminders(result);
                setError(null);
            } catch (err) {
                console.error('加载提醒失败:', err);
                setError('加载提醒失败');
            } finally {
                setLoading(false);
            }
        };

        loadReminders();
    }, [noteId]);

    // 处理编辑提醒
    const handleEdit = (reminder: Reminder) => {
        const reminderDate = new Date(reminder.remind_at * 1000);
        setDate(reminderDate.toISOString().split('T')[0]);
        setTime(reminderDate.toTimeString().slice(0, 5));
        setTitle(reminder.title || '');
        setDescription(reminder.description || '');
        setEditingReminder(reminder);
    };

    // 处理保存提醒
    const handleSave = async () => {
        try {
            const timestamp = Math.floor(new Date(`${date}T${time}`).getTime() / 1000);
            
            if (editingReminder) {
                await invoke('update_reminder', {
                    id: editingReminder.id,
                    remindAt: timestamp,
                    title,
                    description
                });
            } else {
                await invoke('add_reminder', {
                    noteId,
                    remindAt: timestamp,
                    title,
                    description
                });
            }

            // 重新加载提醒列表
            const result = await invoke<Reminder[]>('get_reminders_by_note', { noteId });
            setReminders(result);
            
            // 重置表单
            setDate('');
            setTime('');
            setTitle('');
            setDescription('');
            setEditingReminder(null);
            setError(null);
        } catch (err) {
            console.error('保存提醒失败:', err);
            setError('保存提醒失败');
        }
    };

    // 处理删除提醒
    const handleDelete = async (id: number) => {
        const confirmed = await message(
            '确定要删除这个提醒吗？',
            {
                title: '确认删除',
                type: 'warning',
                okLabel: '删除',
                cancelLabel: '取消'
            }
        );

        if (confirmed) {
            try {
                await invoke('delete_reminder', { id });
                setReminders(reminders.filter(r => r.id !== id));
                setError(null);
            } catch (err) {
                console.error('删除提醒失败:', err);
                setError('删除提醒失败');
            }
        }
    };

    if (loading) {
        return <div className="loading">加载中...</div>;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div 
                className="bg-white rounded-lg shadow-xl p-6 w-[480px] transform transition-transform"
                style={{ 
                    animation: 'modal-slide-up 0.3s ease-out'
                }}
            >
                <h2 className="text-xl font-semibold mb-4">
                    {editingReminder ? '编辑提醒' : '新建提醒'}
                </h2>
                
                {error && (
                    <div className="error-message">
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="mb-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                日期
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                时间
                            </label>
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                标题
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="提醒标题"
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                描述
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="提醒描述"
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        {editingReminder && (
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingReminder(null);
                                    setDate('');
                                    setTime('');
                                    setTitle('');
                                    setDescription('');
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                            >
                                取消编辑
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {editingReminder ? '保存修改' : '添加提醒'}
                        </button>
                    </div>
                </form>

                {reminders.length > 0 && (
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-3">现有提醒</h3>
                        <div className="space-y-2">
                            {reminders.map(reminder => (
                                <div
                                    key={reminder.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                                >
                                    <div className="reminder-info">
                                        <strong>{reminder.title || '未命名提醒'}</strong>
                                        <p>{new Date(reminder.remind_at * 1000).toLocaleString()}</p>
                                        {reminder.description && (
                                            <p className="description">{reminder.description}</p>
                                        )}
                                    </div>
                                    <div className="reminder-actions">
                                        <button
                                            onClick={() => handleEdit(reminder)}
                                            className="text-blue-600 hover:text-blue-700"
                                        >
                                            编辑
                                        </button>
                                        <button
                                            onClick={() => handleDelete(reminder.id)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            删除
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// 添加到全局样式文件
const style = document.createElement('style');
style.textContent = `
@keyframes modal-slide-up {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes shake {
    0%, 100% { transform: translate(0, 0); }
    25% { transform: translate(-5px, -5px); }
    50% { transform: translate(5px, 5px); }
    75% { transform: translate(-5px, 5px); }
}
`;
document.head.appendChild(style); 