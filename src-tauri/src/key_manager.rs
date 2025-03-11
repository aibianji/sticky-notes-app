use rand::{distributions::Alphanumeric, Rng};
use std::io::{Error, ErrorKind};

// 应用的唯一标识符，用于在凭据管理器中存储密钥
const APP_ID: &str = "com.stickynotes.app";
const KEY_LENGTH: usize = 32; // 256位密钥

#[cfg(windows)]
pub fn get_encryption_key() -> Result<String, Error> {
    use std::ffi::OsStr;
    use std::iter::once;
    use std::os::windows::ffi::OsStrExt;
    use windows::core::{PCWSTR, PWSTR};
    use windows::Win32::Foundation::ERROR_NOT_FOUND;
    use windows::Win32::Security::Credentials::{
        CredDeleteW, CredFree, CredReadW, CredWriteW, CREDENTIALW, CRED_PERSIST_LOCAL_MACHINE,
        CRED_TYPE_GENERIC,
    };

    // 将&str转换为PCWSTR（宽字符串）
    fn to_pcwstr(s: &str) -> PCWSTR {
        let v: Vec<u16> = OsStr::new(s).encode_wide().chain(once(0)).collect();
        PCWSTR::from_raw(v.as_ptr())
    }

    unsafe {
        let target_name = to_pcwstr(APP_ID);
        let mut credential_ptr = std::ptr::null_mut();

        // 尝试读取现有的凭据
        let result = CredReadW(
            target_name,
            CRED_TYPE_GENERIC,
            0,
            &mut credential_ptr,
        );

        // 如果找到凭据，解析并返回
        if result.is_ok() && !credential_ptr.is_null() {
            let credential = &*credential_ptr;
            if credential.CredentialBlobSize > 0 && !credential.CredentialBlob.is_null() {
                let blob_slice = std::slice::from_raw_parts(
                    credential.CredentialBlob,
                    credential.CredentialBlobSize as usize,
                );
                let key = String::from_utf8_lossy(blob_slice).to_string();
                CredFree(credential_ptr as *mut _);
                return Ok(key);
            }
            CredFree(credential_ptr as *mut _);
        }

        // 如果凭据不存在或读取失败，生成新密钥
        let key = generate_random_key();
        
        // 将密钥存储到凭据管理器
        let mut cred = CREDENTIALW {
            Flags: 0,
            Type: CRED_TYPE_GENERIC,
            TargetName: target_name.0 as PWSTR,
            Comment: PWSTR::null(),
            LastWritten: windows::Win32::Foundation::FILETIME::default(),
            CredentialBlobSize: key.len() as u32,
            CredentialBlob: key.as_bytes().as_ptr() as *mut u8,
            Persist: CRED_PERSIST_LOCAL_MACHINE,
            AttributeCount: 0,
            Attributes: std::ptr::null_mut(),
            TargetAlias: PWSTR::null(),
            UserName: PWSTR::null(),
        };

        if CredWriteW(&mut cred, 0).is_ok() {
            Ok(key)
        } else {
            Err(Error::new(
                ErrorKind::Other,
                "无法将加密密钥写入凭据管理器",
            ))
        }
    }
}

#[cfg(windows)]
pub fn delete_encryption_key() -> Result<(), Error> {
    use std::ffi::OsStr;
    use std::iter::once;
    use std::os::windows::ffi::OsStrExt;
    use windows::core::PCWSTR;
    use windows::Win32::Security::Credentials::{CredDeleteW, CRED_TYPE_GENERIC};

    // 将&str转换为PCWSTR（宽字符串）
    fn to_pcwstr(s: &str) -> PCWSTR {
        let v: Vec<u16> = OsStr::new(s).encode_wide().chain(once(0)).collect();
        PCWSTR::from_raw(v.as_ptr())
    }

    unsafe {
        let target_name = to_pcwstr(APP_ID);
        if CredDeleteW(target_name, CRED_TYPE_GENERIC, 0).is_ok() {
            Ok(())
        } else {
            Err(Error::new(ErrorKind::NotFound, "未找到加密密钥"))
        }
    }
}

// 针对非Windows平台的简化实现（仅用于开发测试）
#[cfg(not(windows))]
pub fn get_encryption_key() -> Result<String, Error> {
    use std::fs::File;
    use std::io::{Read, Write};
    use std::path::PathBuf;
    
    let key_path = get_key_path()?;

    // 尝试读取现有密钥
    if let Ok(mut file) = File::open(&key_path) {
        let mut key = String::new();
        file.read_to_string(&mut key)?;
        if !key.is_empty() {
            return Ok(key);
        }
    }

    // 生成新密钥并保存
    let key = generate_random_key();
    if let Some(parent) = key_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let mut file = File::create(&key_path)?;
    file.write_all(key.as_bytes())?;
    
    Ok(key)
}

#[cfg(not(windows))]
pub fn delete_encryption_key() -> Result<(), Error> {
    let key_path = get_key_path()?;
    if key_path.exists() {
        std::fs::remove_file(key_path)?;
    }
    Ok(())
}

#[cfg(not(windows))]
fn get_key_path() -> Result<PathBuf, Error> {
    let mut path = match dirs::config_dir() {
        Some(config_dir) => config_dir,
        None => return Err(Error::new(ErrorKind::NotFound, "无法找到配置目录")),
    };
    path.push("stickynotes");
    path.push("encryption_key");
    Ok(path)
}

// 生成随机加密密钥
fn generate_random_key() -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(KEY_LENGTH)
        .map(char::from)
        .collect()
} 