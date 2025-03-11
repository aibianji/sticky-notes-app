use tauri::{
    api::notification::Notification,
    plugin::global_shortcut::{GlobalShortcut, GlobalShortcutEvent, GlobalShortcutManager},
    AppHandle, Manager, Runtime, Window,
};
use crate::commands::DatabaseState;
use crate::screenshot;
use crate::settings::Settings;
use std::sync::Mutex;
use std::collections::HashMap;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use notify_rust::Notification as NotifyNotification;

#[derive(Debug)]
pub enum ShortcutError {
    AlreadyRegistered(String),
    InvalidShortcut(String),
    SystemError(String),
}

impl std::fmt::Display for ShortcutError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ShortcutError::AlreadyRegistered(shortcut) => 
                write!(f, "快捷键 {} 已被其他程序占用", shortcut),
            ShortcutError::InvalidShortcut(shortcut) => 
                write!(f, "快捷键 {} 格式无效", shortcut),
            ShortcutError::SystemError(err) => 
                write!(f, "系统错误: {}", err),
        }
    }
}

// 全局快捷键映射表
static SHORTCUT_MAP: Lazy<Mutex<HashMap<String, String>>> = Lazy::new(|| {
    let mut map = HashMap::new();
    // 默认快捷键
    map.insert("open_main_window".to_string(), "CommandOrControl+Shift+C".to_string());
    map.insert("trigger_screenshot".to_string(), "CommandOrControl+Shift+X".to_string());
    Mutex::new(map)
});

// 快捷键映射数据结构
#[derive(Debug, Serialize, Deserialize)]
pub struct ShortcutMapping {
    pub action: String,
    pub shortcut: String,
}

// 注册所有全局快捷键
pub fn register_shortcuts<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let shortcuts = SHORTCUT_MAP.lock().unwrap();
    
    // 清除所有已有快捷键
    let mut shortcut_manager = app.global_shortcut_manager();
    shortcut_manager.unregister_all().map_err(|e| e.to_string())?;
    
    // 注册"打开主窗口"快捷键
    if let Some(shortcut) = shortcuts.get("open_main_window") {
        register_shortcut(
            &mut shortcut_manager, 
            shortcut, 
            app.clone(), 
            |app| open_main_window(app)
        ).map_err(|e| format!("注册打开主窗口快捷键失败: {}", e))?;
    }
    
    // 注册"触发截图"快捷键
    if let Some(shortcut) = shortcuts.get("trigger_screenshot") {
        register_shortcut(
            &mut shortcut_manager, 
            shortcut, 
            app.clone(), 
            |app| trigger_screenshot(app)
        ).map_err(|e| format!("注册截图快捷键失败: {}", e))?;
    }
    
    Ok(())
}

// 注册单个快捷键，带冲突检测
fn register_shortcut<R: Runtime, F>(
    shortcut_manager: &mut GlobalShortcutManager<R>,
    shortcut: &str,
    app: AppHandle<R>,
    callback: F
) -> Result<(), String>
where
    F: Fn(AppHandle<R>) + Send + 'static,
{
    // 检查快捷键是否已被注册（冲突检测）
    if shortcut_manager.is_registered(shortcut).map_err(|e| e.to_string())? {
        // 已注册，返回冲突错误
        show_notification(
            "快捷键冲突", 
            &format!("快捷键 {} 已被其他应用程序注册，请在设置中更换快捷键", shortcut)
        );
        return Err(format!("快捷键 {} 已被注册", shortcut));
    }
    
    // 注册快捷键
    shortcut_manager.register(shortcut, move || {
        callback(app.clone());
    }).map_err(|e| e.to_string())?;
    
    Ok(())
}

// 获取所有快捷键映射
pub fn get_all_shortcuts() -> HashMap<String, String> {
    SHORTCUT_MAP.lock().unwrap().clone()
}

// 更新快捷键
pub fn update_shortcut<R: Runtime>(
    app: &AppHandle<R>,
    action: &str,
    new_shortcut: &str
) -> Result<(), String> {
    let mut shortcuts = SHORTCUT_MAP.lock().unwrap();
    
    // 更新映射
    shortcuts.insert(action.to_string(), new_shortcut.to_string());
    
    // 重新注册所有快捷键
    drop(shortcuts); // 释放锁
    register_shortcuts(app)
}

// 打开主窗口的操作
fn open_main_window<R: Runtime>(app: AppHandle<R>) {
    if let Some(window) = app.get_window("main") {
        if !window.is_visible().unwrap_or(false) {
            let _ = window.show();
            let _ = window.set_focus();
        } else {
            let _ = window.set_focus();
        }
    } else {
        // 如果窗口不存在，创建一个新窗口
        super::tray::create_main_window(&app);
    }
}

// 触发截图工具的操作
fn trigger_screenshot<R: Runtime>(app: AppHandle<R>) {
    // 如果模块有screenshot.rs，可以调用其功能
    #[cfg(feature = "screenshot")]
    {
        if let Err(e) = super::screenshot::start_screenshot(&app) {
            show_notification("截图失败", &format!("启动截图工具失败: {}", e));
        }
    }
    
    // 如果没有截图模块，显示一个通知
    #[cfg(not(feature = "screenshot"))]
    {
        show_notification("截图", "触发了截图功能");
    }
}

// 显示系统通知
fn show_notification(title: &str, message: &str) {
    NotifyNotification::new()
        .summary(title)
        .body(message)
        .timeout(5000) // 5秒后自动关闭
        .show()
        .ok();
}

// TAURI 命令：获取所有快捷键
#[tauri::command]
pub fn get_all_shortcut_mappings() -> Vec<ShortcutMapping> {
    let shortcuts = SHORTCUT_MAP.lock().unwrap();
    shortcuts
        .iter()
        .map(|(action, shortcut)| ShortcutMapping {
            action: action.clone(),
            shortcut: shortcut.clone(),
        })
        .collect()
}

// TAURI 命令：检查快捷键是否可用
#[tauri::command]
pub fn check_shortcut(shortcut: String, app_handle: AppHandle) -> Result<bool, String> {
    let shortcut_manager = app_handle.global_shortcut_manager();
    
    // 检查是否已被注册
    match shortcut_manager.is_registered(&shortcut) {
        Ok(is_registered) => Ok(!is_registered),
        Err(e) => Err(e.to_string()),
    }
}

// TAURI 命令：更新快捷键
#[tauri::command]
pub fn update_shortcut_command(
    action: String,
    new_shortcut: String,
    app_handle: AppHandle
) -> Result<(), String> {
    update_shortcut(&app_handle, &action, &new_shortcut)
}

pub fn unregister_shortcuts(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let mut shortcut_manager = app.global_shortcut_manager();
    shortcut_manager.unregister_all()?;
    Ok(())
}

#[tauri::command]
pub async fn update_shortcuts(
    app_handle: tauri::AppHandle,
    new_note: String,
    screenshot: String,
) -> Result<(), String> {
    // 先注销所有快捷键
    let mut shortcut_manager = app_handle.global_shortcut_manager();
    shortcut_manager.unregister_all().map_err(|e| e.to_string())?;

    // 获取设置状态
    let settings_state = app_handle.state::<Mutex<Settings>>();
    let mut settings = settings_state.lock().unwrap();

    // 更新设置中的快捷键
    settings.shortcuts.new_note = new_note.clone();
    settings.shortcuts.screenshot = screenshot.clone();

    // 保存设置
    settings.save().map_err(|e| e.to_string())?;

    // 重新注册快捷键
    register_shortcuts(&app_handle).map_err(|e| e.to_string())?;

    Ok(())
} 