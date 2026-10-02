use aes_gcm::{aead::{Aead, KeyInit}, Aes256Gcm, Nonce};
use argon2::Argon2;
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use rand::{rng, RngCore};
use serde::{Deserialize, Serialize};
use tauri::{Manager, State};
use zeroize::Zeroizing;
use std::{sync::Mutex, time::Duration};

#[derive(Default)]
struct AppState {
    clipboard_timer: Mutex<Option<tauri::async_runtime::JoinHandle<()>>>,
    registered_hotkey: Mutex<Option<tauri_plugin_global_shortcut::Shortcut>>,
}

#[derive(Serialize, Deserialize)]
struct EncryptedNote { version: u8, salt: String, nonce: String, ciphertext: String }

#[derive(Debug, thiserror::Error)]
enum CryptoError { #[error("invalid encrypted note")] Invalid, #[error("encryption failed")] Encryption, #[error("decryption failed")] Decryption }

impl serde::Serialize for CryptoError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error> where S: serde::Serializer { serializer.serialize_str(&self.to_string()) }
}

fn derive_key(password: &str, salt: &[u8]) -> Result<Zeroizing<[u8; 32]>, CryptoError> {
    let mut key = Zeroizing::new([0u8; 32]);
    Argon2::default().hash_password_into(password.as_bytes(), salt, &mut *key).map_err(|_| CryptoError::Encryption)?;
    Ok(key)
}

#[tauri::command]
fn encrypt_note(plaintext: String, password: String) -> Result<String, CryptoError> {
    let mut salt = [0u8; 16]; let mut nonce = [0u8; 12]; rng().fill_bytes(&mut salt); rng().fill_bytes(&mut nonce);
    let key = derive_key(&password, &salt)?;
    let cipher = Aes256Gcm::new_from_slice(&*key).map_err(|_| CryptoError::Encryption)?;
    let ciphertext = cipher.encrypt(Nonce::from_slice(&nonce), plaintext.as_bytes()).map_err(|_| CryptoError::Encryption)?;
    serde_json::to_string(&EncryptedNote { version: 1, salt: B64.encode(salt), nonce: B64.encode(nonce), ciphertext: B64.encode(ciphertext) }).map_err(|_| CryptoError::Encryption)
}

#[tauri::command]
fn decrypt_note(container: String, password: String) -> Result<String, CryptoError> {
    let note: EncryptedNote = serde_json::from_str(&container).map_err(|_| CryptoError::Invalid)?;
    if note.version != 1 { return Err(CryptoError::Invalid); }
    let salt = B64.decode(note.salt).map_err(|_| CryptoError::Invalid)?; let nonce = B64.decode(note.nonce).map_err(|_| CryptoError::Invalid)?; let ciphertext = B64.decode(note.ciphertext).map_err(|_| CryptoError::Invalid)?;
    if nonce.len() != 12 { return Err(CryptoError::Invalid); }
    let key = derive_key(&password, &salt)?; let cipher = Aes256Gcm::new_from_slice(&*key).map_err(|_| CryptoError::Decryption)?;
    let plaintext = cipher.decrypt(Nonce::from_slice(&nonce), ciphertext.as_ref()).map_err(|_| CryptoError::Decryption)?;
    String::from_utf8(plaintext).map_err(|_| CryptoError::Decryption)
}

#[tauri::command]
async fn write_clipboard(app: tauri::AppHandle, state: State<'_, AppState>, text: String) -> Result<(), String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    app.clipboard().write_text(text.clone()).map_err(|e| e.to_string())?;
    if let Some(old) = state.clipboard_timer.lock().map_err(|_| "clipboard state unavailable")?.take() { old.abort(); }
    let handle = tauri::async_runtime::spawn(async move { tokio::time::sleep(Duration::from_secs(30)).await; let _ = app.clipboard().write_text(""); });
    *state.clipboard_timer.lock().map_err(|_| "clipboard state unavailable")? = Some(handle);
    Ok(())
}

#[tauri::command]
fn destroy_note(note_id: String) -> Result<(), String> { if note_id.is_empty() { Err("missing note id".into()) } else { Ok(()) } }

#[tauri::command]
fn set_window_always_on_top(window: tauri::WebviewWindow, enabled: bool) -> Result<(), String> {
    window.set_always_on_top(enabled).map_err(|e| e.to_string())
}

#[tauri::command]
fn register_hotkey(app: tauri::AppHandle, state: State<'_, AppState>, shortcut_text: String) -> Result<(), String> {
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
    let shortcut: Shortcut = shortcut_text.parse::<Shortcut>().map_err(|e| e.to_string())?;
    if let Some(previous) = state.registered_hotkey.lock().map_err(|_| "hotkey state unavailable")?.take() {
        let _ = app.global_shortcut().unregister(previous);
    }
    let callback_shortcut = shortcut.clone();
    app.global_shortcut().on_shortcut(callback_shortcut, move |app, _, event| {
        if event.state == ShortcutState::Pressed {
            if let Some(window) = app.get_webview_window("main") { let _ = window.show(); let _ = window.set_focus(); }
        }
    }).map_err(|e| e.to_string())?;
    *state.registered_hotkey.lock().map_err(|_| "hotkey state unavailable")? = Some(shortcut);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            use tauri::menu::{MenuBuilder, MenuItemBuilder};
            use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
            use tauri::WindowEvent;
            let icon = app.default_window_icon().cloned().ok_or("missing application icon")?;
            if let Some(window) = app.get_webview_window("main") {
                let window_for_close = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window_for_close.hide();
                    }
                });
            }
            let open_item = MenuItemBuilder::with_id("open", "Open Uriel").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Close Uriel").build(app)?;
            let menu = MenuBuilder::new(app).items(&[&open_item, &quit_item]).build()?;
            TrayIconBuilder::with_id("main")
                .icon(icon)
                .menu(&menu)
                .tooltip("Uriel · encrypted scratchpad")
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "open" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![encrypt_note, decrypt_note, write_clipboard, destroy_note, set_window_always_on_top, register_hotkey])
        .run(tauri::generate_context!())
        .expect("error while running Uriel");
}
