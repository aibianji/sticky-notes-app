import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { message } from '@tauri-apps/api/dialog';

interface Category {
    id: number;
    name: string;
    color: string;
    sort_order: number;
}

interface CategoryManagerProps {
    onClose: () => void;
    onCategoryChange: () => void;
}

const DEFAULT_COLORS = [
    { name: '灰色', value: '#808080' },
    { name: '红色', value: '#F44336' },
    { name: '粉色', value: '#E91E63' },
    { name: '紫色', value: '#9C27B0' },
    { name: '深紫', value: '#673AB7' },
    { name: '靛蓝', value: '#3F51B5' },
    { name: '蓝色', value: '#2196F3' },
    { name: '青色', value: '#00BCD4' },
    { name: '蓝绿', value: '#009688' },
    { name: '绿色', value: '#4CAF50' },
    { name: '黄绿', value: '#8BC34A' },
    { name: '黄色', value: '#FFEB3B' },
    { name: '琥珀', value: '#FFC107' },
    { name: '橙色', value: '#FF9800' },
    { name: '深橙', value: '#FF5722' },
    { name: '棕色', value: '#795548' },
];

export function CategoryManager({ onClose, onCategoryChange }: CategoryManagerProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [newCategory, setNewCategory] = useState({ name: '', color: DEFAULT_COLORS[0].value });
    const [draggedCategory, setDraggedCategory] = useState<Category | null>(null);
    const [showColorPicker, setShowColorPicker] = useState(false);

    // 加载分类列表
    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const categories = await invoke<Category[]>('get_categories');
            setCategories(categories);
        } catch (err) {
            console.error('Failed to load categories:', err);
            await message('加载分类失败', { title: '错误', type: 'error' });
        }
    };

    // 添加分类
    const handleAddCategory = async () => {
        if (!newCategory.name.trim()) {
            await message('请输入分类名称', { title: '提示', type: 'warning' });
            return;
        }

        try {
            await invoke('add_category', {
                name: newCategory.name,
                color: newCategory.color,
            });
            setNewCategory({ name: '', color: DEFAULT_COLORS[0].value });
            await loadCategories();
            onCategoryChange();
        } catch (err) {
            console.error('Failed to add category:', err);
            await message('添加分类失败', { title: '错误', type: 'error' });
        }
    };

    // 更新分类
    const handleUpdateCategory = async (category: Category) => {
        try {
            await invoke('update_category', {
                id: category.id,
                name: category.name,
                color: category.color,
            });
            setEditingCategory(null);
            await loadCategories();
            onCategoryChange();
        } catch (err) {
            console.error('Failed to update category:', err);
            await message('更新分类失败', { title: '错误', type: 'error' });
        }
    };

    // 删除分类
    const handleDeleteCategory = async (id: number) => {
        const confirmed = await message('确定要删除这个分类吗？该分类下的便签将变为未分类。', {
            title: '确认删除',
            type: 'warning',
            okLabel: '删除',
            cancelLabel: '取消',
        });

        if (confirmed) {
            try {
                await invoke('delete_category', { id });
                await loadCategories();
                onCategoryChange();
            } catch (err) {
                console.error('Failed to delete category:', err);
                await message('删除分类失败', { title: '错误', type: 'error' });
            }
        }
    };

    // 处理拖拽排序
    const handleDragStart = (category: Category) => {
        setDraggedCategory(category);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = async (targetCategory: Category) => {
        if (!draggedCategory || draggedCategory.id === targetCategory.id) return;

        const newCategories = [...categories];
        const draggedIndex = categories.findIndex(c => c.id === draggedCategory.id);
        const targetIndex = categories.findIndex(c => c.id === targetCategory.id);

        // 交换位置
        newCategories.splice(draggedIndex, 1);
        newCategories.splice(targetIndex, 0, draggedCategory);

        // 更新排序
        try {
            for (let i = 0; i < newCategories.length; i++) {
                await invoke('update_category_order', {
                    id: newCategories[i].id,
                    newOrder: i,
                });
            }
            await loadCategories();
            onCategoryChange();
        } catch (err) {
            console.error('Failed to update category order:', err);
            await message('更新分类顺序失败', { title: '错误', type: 'error' });
        }

        setDraggedCategory(null);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl w-96 max-h-[80vh] flex flex-col">
                {/* 标题栏 */}
                <div className="flex justify-between items-center px-4 py-3 border-b">
                    <h2 className="text-lg font-semibold">分类管理</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        ×
                    </button>
                </div>

                {/* 添加分类 */}
                <div className="p-4 border-b">
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            value={newCategory.name}
                            onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                            placeholder="新分类名称"
                            className="flex-1 px-3 py-2 border rounded"
                        />
                        <div className="relative">
                            <button
                                onClick={() => setShowColorPicker(!showColorPicker)}
                                className="w-10 h-10 rounded border"
                                style={{ backgroundColor: newCategory.color }}
                            />
                            {showColorPicker && (
                                <div className="absolute right-0 mt-1 p-2 bg-white rounded shadow-lg z-10">
                                    <div className="grid grid-cols-4 gap-1">
                                        {DEFAULT_COLORS.map((color) => (
                                            <button
                                                key={color.value}
                                                onClick={() => {
                                                    setNewCategory({ ...newCategory, color: color.value });
                                                    setShowColorPicker(false);
                                                }}
                                                className="w-6 h-6 rounded border"
                                                style={{ backgroundColor: color.value }}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleAddCategory}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            添加
                        </button>
                    </div>
                </div>

                {/* 分类列表 */}
                <div className="flex-1 overflow-y-auto">
                    {categories.map((category) => (
                        <div
                            key={category.id}
                            className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-move"
                            draggable
                            onDragStart={() => handleDragStart(category)}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(category)}
                        >
                            {editingCategory?.id === category.id ? (
                                <div className="flex-1 flex items-center space-x-2">
                                    <input
                                        type="text"
                                        value={editingCategory.name}
                                        onChange={(e) => setEditingCategory({
                                            ...editingCategory,
                                            name: e.target.value,
                                        })}
                                        className="flex-1 px-2 py-1 border rounded"
                                    />
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowColorPicker(!showColorPicker)}
                                            className="w-6 h-6 rounded border"
                                            style={{ backgroundColor: editingCategory.color }}
                                        />
                                        {showColorPicker && (
                                            <div className="absolute right-0 mt-1 p-2 bg-white rounded shadow-lg z-10">
                                                <div className="grid grid-cols-4 gap-1">
                                                    {DEFAULT_COLORS.map((color) => (
                                                        <button
                                                            key={color.value}
                                                            onClick={() => {
                                                                setEditingCategory({
                                                                    ...editingCategory,
                                                                    color: color.value,
                                                                });
                                                                setShowColorPicker(false);
                                                            }}
                                                            className="w-6 h-6 rounded border"
                                                            style={{ backgroundColor: color.value }}
                                                            title={color.name}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleUpdateCategory(editingCategory)}
                                        className="px-2 py-1 text-blue-500 hover:text-blue-600"
                                    >
                                        保存
                                    </button>
                                    <button
                                        onClick={() => setEditingCategory(null)}
                                        className="px-2 py-1 text-gray-500 hover:text-gray-600"
                                    >
                                        取消
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div
                                        className="w-4 h-4 rounded mr-2"
                                        style={{ backgroundColor: category.color }}
                                    />
                                    <span className="flex-1">{category.name}</span>
                                    <button
                                        onClick={() => setEditingCategory(category)}
                                        className="px-2 py-1 text-gray-500 hover:text-gray-600"
                                    >
                                        编辑
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCategory(category.id)}
                                        className="px-2 py-1 text-red-500 hover:text-red-600"
                                    >
                                        删除
                                    </button>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                {/* 底部按钮 */}
                <div className="p-4 border-t">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                        关闭
                    </button>
                </div>
            </div>
        </div>
    );
} 