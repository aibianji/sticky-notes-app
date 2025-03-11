use tauri::{
    AppHandle, CustomMenuItem, Manager, Tray, TrayEvent,
    TrayMenu, TrayMenuItem, Window,
};
use window_vibrancy::apply_blur;

/// 创建系统托盘菜单
pub fn create_tray_menu() -> TrayMenu {
    // 创建菜单项
    let show = CustomMenuItem::new("show".to_string(), "显示主窗口");
    let new_note = CustomMenuItem::new("new_note".to_string(), "新建便签");
    let settings = CustomMenuItem::new("settings".to_string(), "设置");
    let quit = CustomMenuItem::new("quit".to_string(), "退出");

    // 构建菜单
    TrayMenu::new()
        .add_item(show)
        .add_item(new_note)
        .add_native_item(TrayMenuItem::Separator)
        .add_item(settings)
        .add_native_item(TrayMenuItem::Separator)
        .add_item(quit)
}

/// 创建系统托盘
pub fn create_tray() -> Tray {
    let tray_menu = create_tray_menu();
    Tray::new().with_menu(tray_menu)
}

/// 处理托盘事件
pub fn handle_tray_event(app: &AppHandle, event: TrayEvent) {
    match event {
        // 托盘菜单项点击
        TrayEvent::MenuItemClick { id, .. } => match id.as_str() {
            "quit" => {
                // 退出应用
                std::process::exit(0);
            }
            "show" => {
                // 显示主窗口
                if let Some(window) = app.get_window("main") {
                    if !window.is_visible().unwrap_or(false) {
                        window.show().unwrap();
                        window.unminimize().unwrap();
                        window.set_focus().unwrap();
                    } else {
                        window.hide().unwrap();
                    }
                } else {
                    // 如果窗口不存在，可以创建一个新窗口
                    create_main_window(app);
                }
            }
            "new_note" => {
                // 创建新便签
                create_note_window(app);
            }
            "settings" => {
                // 打开设置窗口
                open_settings_window(app);
            }
            _ => {}
        },
        // 托盘图标左键点击
        TrayEvent::LeftClick { .. } => {
            // 左键点击切换主窗口显示/隐藏
            if let Some(window) = app.get_window("main") {
                if window.is_visible().unwrap_or(false) {
                    window.hide().unwrap();
                } else {
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
            } else {
                create_main_window(app);
            }
        }
        // 双击托盘图标
        TrayEvent::DoubleClick { .. } => {
            // 创建新便签
            create_note_window(app);
        }
        _ => {}
    }
}

// 创建主窗口
fn create_main_window(app: &AppHandle) {
    if app.get_window("main").is_none() {
        tauri::WindowBuilder::new(
            app,
            "main",
            tauri::WindowUrl::App("index.html".into()),
        )
        .title("便签")
        .resizable(true)
        .fullscreen(false)
        .center()
        .build()
        .unwrap();
    }
}

// 创建新便签窗口
fn create_note_window(app: &AppHandle) {
    let label = format!("note_{}", chrono::Utc::now().timestamp_millis());
    
    tauri::WindowBuilder::new(
        app,
        &label,
        tauri::WindowUrl::App("note.html".into()),
    )
    .title("新便签")
    .inner_size(300.0, 300.0)
    .resizable(true)
    .decorations(false)
    .always_on_top(true)
    .transparent(true)
    .build()
    .unwrap();
}

// 打开设置窗口
fn open_settings_window(app: &AppHandle) {
    if let Some(window) = app.get_window("settings") {
        window.show().unwrap();
        window.set_focus().unwrap();
    } else {
        tauri::WindowBuilder::new(
            app,
            "settings",
            tauri::WindowUrl::App("settings.html".into()),
        )
        .title("设置")
        .inner_size(500.0, 400.0)
        .resizable(false)
        .center()
        .build()
        .unwrap();
    }
} 