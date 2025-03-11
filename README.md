# 轻量级便签工具 - StickyNotes

## 项目目标
- 开发资源占用低于50MB的便签工具
- 安装包控制在10MB内
- 提供简洁高效的便签功能

## 技术栈
- 前端: HTML/CSS/TypeScript
- 后端: Rust + Tauri
- 数据存储: SQLite (加密存储)

## 核心功能
1. **后台常驻与唤醒**
   - 系统托盘图标（右键菜单：退出/设置）
   - 全局快捷键支持:
     - Win+Shift+C：打开主输入窗口
     - Win+Shift+X：触发截图工具

2. **快速记录与存储**
   - 文本输入：纯文本即时保存（支持拖拽调整窗口大小）
   - 截图工具：区域截图后自动保存为便签（带时间戳命名）
   - 数据存储：SQLite本地数据库（仅存储文本内容、截图路径、创建时间）

3. **便签列表管理**
   - 按时间倒序排列，支持关键词搜索
   - 双击打开编辑，右键删除

## 技术实现要点
- 使用Tauri框架确保应用体积小、性能高
- 使用SQLite加密存储用户数据
- 实现全局快捷键监听
- 系统托盘图标和通知集成

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
