use std::io::{Read, Write};
use std::net::TcpListener;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use serde::Deserialize;
use tauri::{AppHandle, Emitter, Manager, State};

const CALLBACK_PATH: &str = "/auth/google/callback";
const GOOGLE_TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
/// Message renvoyé au front quand l’utilisateur abandonne la connexion Google.
const CANCELLED_ERROR: &str = "Google sign-in cancelled";
const SUCCESS_HTML: &str = r#"<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Spend.Up</title></head>
<body>
  <h1>Spend.Up</h1>
  <p>Compte Google autorisé. Vous pouvez fermer cette fenêtre et retourner dans l’application.</p>
  <script>window.close();</script>
</body>
</html>"#;

/// Drapeau d’annulation de l’attente loopback en cours (une seule à la fois).
#[derive(Default)]
struct OauthState {
    cancel: Mutex<Option<Arc<AtomicBool>>>,
}

/// Attend le redirect OAuth Google sur `http://127.0.0.1:<port>/auth/google/callback`.
/// Émet l’événement `oauth-loopback-ready` avec l’URI exacte à utiliser comme `redirect_uri`.
#[tauri::command]
async fn oauth_loopback_wait(
    app: AppHandle,
    state: State<'_, OauthState>,
    timeout_ms: u64,
) -> Result<String, String> {
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| format!("bind loopback: {e}"))?;
    listener
        .set_nonblocking(true)
        .map_err(|e| format!("nonblocking: {e}"))?;

    let port = listener
        .local_addr()
        .map_err(|e| format!("local_addr: {e}"))?
        .port();
    let redirect_uri = format!("http://127.0.0.1:{port}{CALLBACK_PATH}");

    let cancel = Arc::new(AtomicBool::new(false));
    {
        let mut current = state
            .cancel
            .lock()
            .map_err(|_| "oauth state poisoned".to_string())?;
        // Une attente orpheline (fenêtre rechargée, double clic) doit s’arrêter.
        if let Some(previous) = current.replace(Arc::clone(&cancel)) {
            previous.store(true, Ordering::SeqCst);
        }
    }

    app.emit("oauth-loopback-ready", redirect_uri.clone())
        .map_err(|e| format!("emit: {e}"))?;

    let timeout = Duration::from_millis(timeout_ms.max(1_000));
    let flag = Arc::clone(&cancel);

    let outcome = tauri::async_runtime::spawn_blocking(move || {
        accept_oauth_callback(listener, port, timeout, flag)
    })
    .await
    .map_err(|e| format!("join: {e}"))?;

    if let Ok(mut current) = state.cancel.lock() {
        if current
            .as_ref()
            .is_some_and(|active| Arc::ptr_eq(active, &cancel))
        {
            *current = None;
        }
    }

    outcome
}

/// Interrompt l’attente loopback (l’utilisateur a fermé l’onglet ou cliqué sur « Annuler »).
#[tauri::command]
fn oauth_loopback_cancel(state: State<'_, OauthState>) -> Result<(), String> {
    let current = state
        .cancel
        .lock()
        .map_err(|_| "oauth state poisoned".to_string())?;
    if let Some(active) = current.as_ref() {
        active.store(true, Ordering::SeqCst);
    }
    Ok(())
}

/// Échange le code OAuth contre un `id_token` côté native (évite le CORS WebView).
/// Le secret client Desktop est lu depuis l’environnement natif
/// (`GOOGLE_DESKTOP_CLIENT_SECRET` ou `VITE_GOOGLE_DESKTOP_CLIENT_SECRET`) —
/// jamais passé depuis le WebView (évite le bundle JS).
#[tauri::command]
async fn google_exchange_code(
    client_id: String,
    code: String,
    code_verifier: String,
    redirect_uri: String,
) -> Result<String, String> {
    #[derive(Deserialize)]
    struct TokenResponse {
        id_token: Option<String>,
        error: Option<String>,
        error_description: Option<String>,
    }

    validate_exchange_inputs(&client_id, &code, &code_verifier, &redirect_uri)?;

    let mut form = vec![
        ("client_id", client_id.clone()),
        ("code", code.clone()),
        ("code_verifier", code_verifier.clone()),
        ("grant_type", "authorization_code".to_string()),
        ("redirect_uri", redirect_uri.clone()),
    ];
    if let Some(secret) = resolve_google_desktop_client_secret() {
        form.push(("client_secret", secret));
    }

    let client = reqwest::Client::new();
    let response = client
        .post(GOOGLE_TOKEN_URL)
        .form(&form)
        .send()
        .await
        .map_err(|e| format!("token request: {e}"))?;

    let status = response.status();
    let json: TokenResponse = response
        .json()
        .await
        .map_err(|e| format!("token parse: {e}"))?;

    if let Some(id_token) = json.id_token {
        return Ok(id_token);
    }

    Err(json
        .error_description
        .or(json.error)
        .unwrap_or_else(|| format!("Google token exchange failed ({status})")))
}

/// Secret OAuth Desktop : compile-time (`build.rs`) puis variables d’environnement process.
fn resolve_google_desktop_client_secret() -> Option<String> {
    if let Some(embedded) = option_env!("GOOGLE_DESKTOP_CLIENT_SECRET") {
        let trimmed = embedded.trim();
        if !trimmed.is_empty() {
            return Some(trimmed.to_string());
        }
    }
    for key in ["GOOGLE_DESKTOP_CLIENT_SECRET", "VITE_GOOGLE_DESKTOP_CLIENT_SECRET"] {
        if let Ok(value) = std::env::var(key) {
            let trimmed = value.trim().to_string();
            if !trimmed.is_empty() {
                return Some(trimmed);
            }
        }
    }
    None
}

fn validate_exchange_inputs(
    client_id: &str,
    code: &str,
    code_verifier: &str,
    redirect_uri: &str,
) -> Result<(), String> {
    if client_id.trim().is_empty() {
        return Err("client_id is required".into());
    }
    if code.trim().is_empty() {
        return Err("code is required".into());
    }
    if code_verifier.trim().is_empty() {
        return Err("code_verifier is required".into());
    }
    if !is_allowed_oauth_redirect_uri(redirect_uri) {
        return Err(format!(
            "redirect_uri must be http://127.0.0.1:<port>{CALLBACK_PATH}"
        ));
    }
    Ok(())
}

/// Autorise uniquement le redirect loopback Google Desktop (pas d’open-redirect IPC).
/// Format exact : `http://127.0.0.1:<port>/auth/google/callback` (sans query / fragment).
fn is_allowed_oauth_redirect_uri(uri: &str) -> bool {
    let Some(rest) = uri.strip_prefix("http://127.0.0.1:") else {
        return false;
    };
    let Some((port_str, path)) = rest.split_once('/') else {
        return false;
    };
    if path != &CALLBACK_PATH[1..] {
        return false;
    }
    if port_str.is_empty() || !port_str.chars().all(|c| c.is_ascii_digit()) {
        return false;
    }
    matches!(port_str.parse::<u16>(), Ok(port) if port > 0)
}

fn accept_oauth_callback(
    listener: TcpListener,
    port: u16,
    timeout: Duration,
    cancel: Arc<AtomicBool>,
) -> Result<String, String> {
    let started = Instant::now();

    loop {
        if cancel.load(Ordering::SeqCst) {
            return Err(CANCELLED_ERROR.into());
        }
        if started.elapsed() >= timeout {
            return Err("Google sign-in timed out".into());
        }

        let (mut stream, _) = match listener.accept() {
            Ok(conn) => conn,
            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                std::thread::sleep(Duration::from_millis(50));
                continue;
            }
            Err(e) => return Err(format!("accept: {e}")),
        };

        let _ = stream.set_read_timeout(Some(Duration::from_secs(5)));
        let mut buf = [0u8; 8192];
        let n = match stream.read(&mut buf) {
            Ok(n) => n,
            Err(_) => continue,
        };
        let req = String::from_utf8_lossy(&buf[..n]);
        let first_line = req.lines().next().unwrap_or("");
        let target = first_line.split_whitespace().nth(1).unwrap_or("");

        // Ignore favicon / probes — attend le vrai callback OAuth.
        if !target.starts_with(CALLBACK_PATH) {
            let _ = write_http_response(&mut stream, 404, b"Not Found");
            continue;
        }

        let _ = write_http_response(&mut stream, 200, SUCCESS_HTML.as_bytes());
        return Ok(format!("http://127.0.0.1:{port}{target}"));
    }
}

fn write_http_response(stream: &mut impl Write, status: u16, body: &[u8]) -> std::io::Result<()> {
    let reason = match status {
        200 => "OK",
        404 => "Not Found",
        _ => "Error",
    };
    let header = format!(
        "HTTP/1.1 {status} {reason}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        body.len()
    );
    stream.write_all(header.as_bytes())?;
    stream.write_all(body)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        // Doit rester le 1er plugin : avec feature `deep-link`, les argv de la
        // 2ᵉ instance sont forwardés au DeepLink *avant* ce callback.
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }));
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            oauth_loopback_wait,
            oauth_loopback_cancel,
            google_exchange_code
        ])
        .setup(|app| {
            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all()?;
            }
            app.manage(OauthState::default());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Spend.Up");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_loopback_redirect_uri() {
        assert!(is_allowed_oauth_redirect_uri(
            "http://127.0.0.1:54321/auth/google/callback"
        ));
        assert!(is_allowed_oauth_redirect_uri(
            "http://127.0.0.1:1/auth/google/callback"
        ));
        assert!(is_allowed_oauth_redirect_uri(
            "http://127.0.0.1:65535/auth/google/callback"
        ));
    }

    #[test]
    fn rejects_unsafe_redirect_uris() {
        assert!(!is_allowed_oauth_redirect_uri(
            "https://127.0.0.1:54321/auth/google/callback"
        ));
        assert!(!is_allowed_oauth_redirect_uri(
            "http://localhost:54321/auth/google/callback"
        ));
        assert!(!is_allowed_oauth_redirect_uri(
            "http://127.0.0.1/auth/google/callback"
        ));
        assert!(!is_allowed_oauth_redirect_uri(
            "http://127.0.0.1:0/auth/google/callback"
        ));
        assert!(!is_allowed_oauth_redirect_uri(
            "http://127.0.0.1:54321/auth/google/callback?x=1"
        ));
        assert!(!is_allowed_oauth_redirect_uri(
            "http://127.0.0.1:54321/auth/google/callback#frag"
        ));
        assert!(!is_allowed_oauth_redirect_uri(
            "http://evil.test/auth/google/callback"
        ));
        assert!(!is_allowed_oauth_redirect_uri(
            "http://127.0.0.1:54321/auth/google/callback/extra"
        ));
        assert!(!is_allowed_oauth_redirect_uri(""));
    }

    #[test]
    fn validate_exchange_inputs_checks_redirect_and_required_fields() {
        assert!(validate_exchange_inputs(
            "client",
            "code",
            "verifier",
            "http://127.0.0.1:9/auth/google/callback"
        )
        .is_ok());

        assert!(validate_exchange_inputs(
            "",
            "code",
            "verifier",
            "http://127.0.0.1:9/auth/google/callback"
        )
        .is_err());

        assert!(validate_exchange_inputs(
            "client",
            "code",
            "verifier",
            "https://accounts.google.com"
        )
        .unwrap_err()
        .contains("redirect_uri"));
    }
}

