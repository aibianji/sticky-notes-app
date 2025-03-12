use chrono::Local;
use log::{LevelFilter, info, warn, error, debug};
use log4rs::{
    append::{
        console::ConsoleAppender,
        file::FileAppender,
    },
    config::{Appender, Config, Root},
    encode::pattern::PatternEncoder,
};
use std::path::PathBuf;
use tauri::AppHandle;

// 初始化日志系统
pub fn init_logger(app_handle: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let app_dir = app_handle.path_resolver().app_dir().unwrap_or_else(|| PathBuf::from("logs"));
    let log_dir = app_dir.join("logs");
    std::fs::create_dir_all(&log_dir)?;

    let log_file = log_dir.join(format!("app_{}.log", Local::now().format("%Y%m%d")));

    // 控制台输出
    let stdout = ConsoleAppender::builder()
        .encoder(Box::new(PatternEncoder::new("[{d(%Y-%m-%d %H:%M:%S)}] [{l}] {m}{n}")))
        .build();

    // 文件输出
    let file = FileAppender::builder()
        .encoder(Box::new(PatternEncoder::new("[{d(%Y-%m-%d %H:%M:%S)}] [{l}] {m}{n}")))
        .build(log_file)?;

    // 配置日志系统
    let config = Config::builder()
        .appender(Appender::builder().build("stdout", Box::new(stdout)))
        .appender(Appender::builder().build("file", Box::new(file)))
        .build(Root::builder()
            .appender("stdout")
            .appender("file")
            .build(LevelFilter::Debug))?;

    // 应用配置
    log4rs::init_config(config)?;

    info!("日志系统初始化成功");
    Ok(())
}

// 处理前端发送的日志
#[tauri::command]
pub fn log_message(level: String, message: String, args: Option<Vec<String>>) {
    let log_content = if let Some(args) = args {
        format!("{} - Args: {:?}", message, args)
    } else {
        message
    };

    match level.as_str() {
        "DEBUG" => debug!("{}", log_content),
        "INFO" => info!("{}", log_content),
        "WARN" => warn!("{}", log_content),
        "ERROR" => error!("{}", log_content),
        _ => info!("{}", log_content),
    }
} 