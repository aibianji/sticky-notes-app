import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { CategoryManager } from './CategoryManager';

interface Category {
    id: number;
    name: string;
    color: string;
    sort_order: number;
}

interface SidebarProps {
    selectedCategoryId: number | null;
    onSelectCategory: (categoryId: number | null) => void;
}

export function Sidebar({ selectedCategoryId, onSelectCategory }: SidebarProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [showCategoryManager, setShowCategoryManager] = useState(false);

    // 加载分类列表
    const loadCategories = async () => {
        try {
            const categories = await invoke<Category[]>('get_categories');
            setCategories(categories);
        } catch (err) {
            console.error('Failed to load categories:', err);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    return (
        <>
            <div className="w-48 bg-gray-50 border-r flex flex-col h-full">
                {/* 全部便签 */}
                <button
                    className={`flex items-center px-4 py-2 text-left hover:bg-gray-100 ${
                        selectedCategoryId === null ? 'bg-gray-200' : ''
                    }`}
                    onClick={() => onSelectCategory(null)}
                >
                    <span className="flex-1">全部便签</span>
                </button>

                {/* 分类列表 */}
                <div className="flex-1 overflow-y-auto">
                    {categories.map((category) => (
                        <button
                            key={category.id}
                            className={`flex items-center w-full px-4 py-2 text-left hover:bg-gray-100 ${
                                selectedCategoryId === category.id ? 'bg-gray-200' : ''
                            }`}
                            onClick={() => onSelectCategory(category.id)}
                        >
                            <div
                                className="w-3 h-3 rounded mr-2"
                                style={{ backgroundColor: category.color }}
                            />
                            <span className="flex-1 truncate">{category.name}</span>
                        </button>
                    ))}
                </div>

                {/* 分类管理按钮 */}
                <button
                    className="px-4 py-2 text-sm text-blue-500 hover:bg-gray-100 text-left"
                    onClick={() => setShowCategoryManager(true)}
                >
                    管理分类
                </button>
            </div>

            {/* 分类管理对话框 */}
            {showCategoryManager && (
                <CategoryManager
                    onClose={() => setShowCategoryManager(false)}
                    onCategoryChange={loadCategories}
                />
            )}
        </>
    );
} 