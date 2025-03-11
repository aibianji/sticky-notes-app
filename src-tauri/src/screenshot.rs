use tauri::{AppHandle, Manager, Runtime, Window};
use std::path::PathBuf;
use std::fs;
use chrono::Local;
use image::{ImageBuffer, Rgba};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use std::sync::{Arc, Mutex};
use std::io::Cursor;
use image::{DynamicImage, GenericImageView};
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use std::sync::Lazy;

#[derive(Debug, Serialize, Deserialize)]
pub struct ScreenshotResult {
    pub path: String,
    pub width: u32,
    pub height: u32,
    pub timestamp: u64,
}

// 截图状态结构
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScreenshotState {
    pub in_progress: bool,
    pub image_data: Option<String>,
    pub selection: Option<Selection>,
}

// 选择区域结构
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Selection {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

// 静态全局状态
static SCREENSHOT_STATE: Lazy<Arc<Mutex<ScreenshotState>>> = Lazy::new(|| {
    Arc::new(Mutex::new(ScreenshotState {
        in_progress: false,
        image_data: None,
        selection: None,
    }))
});

// 获取截图保存目录
fn get_screenshot_dir() -> PathBuf {
    let app_data_dir = match dirs::data_dir() {
        Some(dir) => dir,
        None => PathBuf::from("."),
    };
    
    let screenshots_dir = app_data_dir.join("stickynotes").join("screenshots");
    
    // 确保目录存在
    if !screenshots_dir.exists() {
        fs::create_dir_all(&screenshots_dir).expect("无法创建截图目录");
    }
    
    screenshots_dir
}

// 生成截图文件名
fn generate_screenshot_filename() -> String {
    let now = Local::now();
    format!("screenshot_{}.png", now.format("%Y%m%d_%H%M%S"))
}

// 保存截图
pub fn save_screenshot(data: &[u8], width: u32, height: u32) -> Result<ScreenshotResult, String> {
    let dir = get_screenshot_dir();
    let filename = generate_screenshot_filename();
    let path = dir.join(&filename);
    
    // 将二进制数据转换为图像
    let img = match image::load_from_memory(data) {
        Ok(img) => img,
        Err(e) => return Err(format!("无法加载图像数据: {}", e)),
    };
    
    // 保存图像
    match img.save(&path) {
        Ok(_) => {
            let timestamp = chrono::Utc::now().timestamp() as u64;
            Ok(ScreenshotResult {
                path: path.to_string_lossy().to_string(),
                width,
                height, 
                timestamp,
            })
        },
        Err(e) => Err(format!("无法保存截图: {}", e)),
    }
}

// 触发截图功能
pub fn trigger_screenshot<R: Runtime>(app: &AppHandle<R>) {
    println!("触发截图...");
    
    // 创建一个截图窗口
    let screenshot_window = match app.get_window("screenshot") {
        Some(window) => window,
        None => {
            let window = tauri::WindowBuilder::new(
                app,
                "screenshot",
                tauri::WindowUrl::App("screenshot.html".into()),
            )
            .title("截图")
            .transparent(true)
            .decorations(false)
            .always_on_top(true)
            .fullscreen(true)
            .build()
            .expect("无法创建截图窗口");
            
            window
        }
    };
    
    // 显示截图窗口
    screenshot_window.show().unwrap();
    screenshot_window.set_focus().unwrap();
    
    // 通知前端开始截图
    screenshot_window.emit("start-screenshot", {}).unwrap();
}

// 启动截图功能
pub fn start_screenshot<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let mut state = SCREENSHOT_STATE.lock().unwrap();
    
    // 检查是否已经在截图中
    if state.in_progress {
        return Err("截图已在进行中".to_string());
    }
    
    // 捕获屏幕截图
    let screenshot_data = capture_screenshot().map_err(|e| format!("截图失败: {}", e))?;
    
    // 更新状态
    state.in_progress = true;
    state.image_data = Some(screenshot_data.clone());
    state.selection = None;
    
    // 打开截图编辑窗口
    open_screenshot_editor(app, screenshot_data)
}

// 拍摄屏幕截图 (平台特定实现)
fn capture_screenshot() -> Result<String, String> {
    // 这里是简化的实现，实际上需要根据不同平台使用不同的截图库
    #[cfg(target_os = "windows")]
    {
        // Windows 截图实现，使用 Windows API
        // 这里使用示例实现，实际项目中可能需要更复杂的方法
        println!("捕获 Windows 屏幕截图");
        
        // 模拟截图数据
        let width = 800;
        let height = 600;
        let mut img = ImageBuffer::new(width, height);
        
        // 创建一个简单的渐变图像
        for (x, y, pixel) in img.enumerate_pixels_mut() {
            let r = (x as f32 / width as f32 * 255.0) as u8;
            let g = (y as f32 / height as f32 * 255.0) as u8;
            let b = 128u8;
            *pixel = Rgba([r, g, b, 255]);
        }
        
        // 转换为base64字符串
        let mut buffer = Vec::new();
        let mut cursor = Cursor::new(&mut buffer);
        img.write_to(&mut cursor, image::ImageOutputFormat::Png)
            .map_err(|e| format!("无法保存截图: {}", e))?;
        
        Ok(format!("data:image/png;base64,{}", BASE64.encode(&buffer)))
    }
    
    #[cfg(target_os = "macos")]
    {
        // macOS截图实现
        println!("捕获 macOS 屏幕截图");
        // 实际实现可能使用 NSScreen API
        Err("macOS 截图功能尚未实现".to_string())
    }
    
    #[cfg(target_os = "linux")]
    {
        // Linux截图实现
        println!("捕获 Linux 屏幕截图");
        // 实际实现可能使用 X11 或 Wayland API
        Err("Linux 截图功能尚未实现".to_string())
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Err("不支持当前平台的截图功能".to_string())
    }
}

// 打开截图编辑窗口
fn open_screenshot_editor<R: Runtime>(app: &AppHandle<R>, screenshot_data: String) -> Result<(), String> {
    // 创建一个新窗口用于截图编辑
    let screenshot_window = tauri::WindowBuilder::new(
        app,
        "screenshot",
        tauri::WindowUrl::App("screenshot.html".into())
    )
    .title("截图工具")
    .fullscreen(true)
    .decorations(false)
    .transparent(true)
    .center()
    .build()
    .map_err(|e| format!("无法创建截图窗口: {}", e))?;
    
    // 设置窗口的截图数据
    let _ = screenshot_window.emit("screenshot-data", &screenshot_data);
    
    Ok(())
}

// 保存截图数据到便签
#[tauri::command]
pub fn save_screenshot_data(
    image_data: String, 
    x: i32, 
    y: i32, 
    width: u32, 
    height: u32, 
    app_handle: AppHandle
) -> Result<String, String> {
    // 更新选择区域
    let mut state = SCREENSHOT_STATE.lock().unwrap();
    state.selection = Some(Selection { x, y, width, height });
    
    // 裁剪图像
    let cropped_image = crop_image(&image_data, x, y, width, height)
        .map_err(|e| format!("裁剪图像失败: {}", e))?;
    
    // 保存图像到临时文件
    let file_path = save_image_to_file(cropped_image)
        .map_err(|e| format!("保存图像失败: {}", e))?;
    
    // 关闭截图窗口
    if let Some(window) = app_handle.get_window("screenshot") {
        let _ = window.close();
    }
    
    // 重置截图状态
    state.in_progress = false;
    state.image_data = None;
    
    // 返回图像路径
    Ok(file_path)
}

// 取消截图
#[tauri::command]
pub fn cancel_screenshot(app_handle: AppHandle) -> Result<(), String> {
    // 重置截图状态
    let mut state = SCREENSHOT_STATE.lock().unwrap();
    state.in_progress = false;
    state.image_data = None;
    state.selection = None;
    
    // 关闭截图窗口
    if let Some(window) = app_handle.get_window("screenshot") {
        let _ = window.close();
    }
    
    Ok(())
}

// 裁剪图像
fn crop_image(base64_image: &str, x: i32, y: i32, width: u32, height: u32) -> Result<DynamicImage, String> {
    // 从 base64 提取数据部分
    let base64_data = base64_image.split(',').nth(1)
        .ok_or_else(|| "无效的图像数据格式".to_string())?;
    
    // 解码 base64
    let image_data = BASE64.decode(base64_data)
        .map_err(|e| format!("base64解码失败: {}", e))?;
    
    // 加载图像
    let img = image::load_from_memory(&image_data)
        .map_err(|e| format!("无法加载图像: {}", e))?;
    
    // 确保裁剪区域在图像范围内
    let img_width = img.width();
    let img_height = img.height();
    
    let safe_x = if x < 0 { 0 } else { x as u32 };
    let safe_y = if y < 0 { 0 } else { y as u32 };
    let safe_width = std::cmp::min(width, img_width - safe_x);
    let safe_height = std::cmp::min(height, img_height - safe_y);
    
    // 裁剪图像
    let cropped = img.crop_imm(safe_x, safe_y, safe_width, safe_height);
    
    Ok(cropped)
}

// 保存图像到文件
fn save_image_to_file(img: DynamicImage) -> Result<String, String> {
    // 获取应用数据目录
    let app_data_dir = dirs::data_dir()
        .ok_or_else(|| "无法获取应用数据目录".to_string())?
        .join("sticky-notes-app")
        .join("screenshots");
    
    // 确保目录存在
    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("无法创建截图目录: {}", e))?;
    
    // 生成唯一文件名
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let filename = format!("screenshot_{}.png", timestamp);
    let file_path = app_data_dir.join(&filename);
    
    // 保存图像
    img.save(&file_path)
        .map_err(|e| format!("保存图像失败: {}", e))?;
    
    // 返回文件路径
    Ok(file_path.to_string_lossy().to_string())
} 