use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::api::path;
use std::fs;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    pub shortcuts: Shortcuts,
    pub appearance: Appearance,
    pub security: Security,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Shortcuts {
    pub new_note: String,
    pub screenshot: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Appearance {
    pub always_on_top: bool,
    pub transparency: f32,
    pub theme: Theme,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum Theme {
    Light,
    Dark,
    System,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Security {
    pub auto_lock: bool,
    pub lock_timeout: u32,
    pub encryption_enabled: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            shortcuts: Shortcuts {
                new_note: "CommandOrControl+Shift+C".to_string(),
                screenshot: "CommandOrControl+Shift+X".to_string(),
            },
            appearance: Appearance {
                always_on_top: true,
                transparency: 0.95,
                theme: Theme::System,
            },
            security: Security {
                auto_lock: false,
                lock_timeout: 5,
                encryption_enabled: true,
            },
        }
    }
}

impl Settings {
    pub fn load() -> Result<Self, Box<dyn std::error::Error>> {
        let config_dir = path::app_config_dir(&tauri::Config::default())
            .ok_or("Failed to get config directory")?;
        let settings_path = config_dir.join("settings.json");

        if !settings_path.exists() {
            return Ok(Settings::default());
        }

        let settings_str = fs::read_to_string(settings_path)?;
        let settings = serde_json::from_str(&settings_str)?;
        Ok(settings)
    }

    pub fn save(&self) -> Result<(), Box<dyn std::error::Error>> {
        let config_dir = path::app_config_dir(&tauri::Config::default())
            .ok_or("Failed to get config directory")?;
        fs::create_dir_all(&config_dir)?;
        
        let settings_path = config_dir.join("settings.json");
        let settings_str = serde_json::to_string_pretty(self)?;
        fs::write(settings_path, settings_str)?;
        
        Ok(())
    }
}

#[tauri::command]
pub async fn update_settings(settings: Settings) -> Result<(), String> {
    settings.save().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_settings() -> Result<Settings, String> {
    Settings::load().map_err(|e| e.to_string())
} 