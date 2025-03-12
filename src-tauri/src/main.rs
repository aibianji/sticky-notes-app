// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod key_manager;
mod db;
mod tray;
mod shortcut;
mod commands;
mod screenshot;
mod settings;
mod reminder;
mod logger;

use std::sync::Mutex;
use once_cell::sync::Lazy;
use tauri::{AppHandle, Manager, CustomMenuItem, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem};
use window_shadows::set_shadow;
use key_manager::KeyManager;

static DB_CONNECTION: Lazy<Mutex<Option<rusqlite::Connection>>> = Lazy::new(|| Mutex::new(None));

// 运行应用程序
#[tauri::command]
fn run_app() -> String {
    "App initialized successfully".into()
}

#[tauri::command]
fn handle_context_menu(window: tauri::Window) {
    let menu = tray::create_tray_menu();
    menu.open(&window, tauri::Position::Cursor);
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // 初始化日志系统
            if let Err(e) = logger::init_logger(app.handle()) {
                eprintln!("日志系统初始化失败: {}", e);
            }
            
            // 创建系统托盘
            let tray = tray::create_tray();
            app.manage(tray);
            
            // 注册全局快捷键
            if let Err(e) = shortcut::register_shortcuts(app.handle()) {
                eprintln!("注册全局快捷键失败: {}", e);
            }

            // 设置窗口阴影（仅适用于Windows和macOS）
            #[cfg(any(windows, target_os = "macos"))]
            {
                let window = app.get_window("main").unwrap();
                set_shadow(&window, true).expect("设置窗口阴影失败");
            }

            Ok(())
        })
        .system_tray(tray)
        .on_system_tray_event(tray::handle_tray_event)
        .invoke_handler(tauri::generate_handler![
            run_app,
            handle_context_menu,
            // 快捷键相关命令
            shortcut::get_all_shortcut_mappings,
            shortcut::check_shortcut,
            shortcut::update_shortcut_command,
            // 便签管理命令
            commands::add_note,
            commands::update_note,
            commands::get_note_by_id,
            commands::get_notes,
            commands::delete_note,
            commands::toggle_pin_note,
            commands::change_note_color,
            commands::move_note_to_category,
            // 分类管理命令
            commands::create_category,
            commands::update_category,
            commands::get_all_categories,
            commands::delete_category,
            // 提醒相关命令
            reminder::add_reminder,
            reminder::update_reminder,
            reminder::get_reminders_by_note,
            reminder::get_all_reminders,
            reminder::delete_reminder,
            // 截图相关命令
            screenshot::save_screenshot_data,
            screenshot::cancel_screenshot,
            // 日志相关命令
            logger::log_message
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
