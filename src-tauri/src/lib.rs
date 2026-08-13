use std::io::{Read, Write};
use std::net::TcpListener;
use std::time::{Duration, Instant};

use serde::Deserialize;
use tauri::{AppHandle, Emitter};

const CALLBACK_PATH: &str = "/auth/google/callback";
const GOOGLE_TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const SUCCESS_HTML: &str = r#"<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Spend.Up</title></head>
<body>
  <h1>Spend.Up</h1>
  <p>Compte Google autorisé. Vous pouvez fermer cette fenêtre et retourner dans l’application.</p>
  <script>window.close();</script>
</body>
</html>"#;

/// Attend le redirect OAuth Google sur `http://127.0.0.1:<port>/auth/google/callback`.
/// Émet l’événement `oauth-loopback-ready` avec l’URI exacte à utiliser comme `redirect_uri`.
#[tauri::command]
async fn oauth_loopback_wait(app: AppHandle, timeout_ms: u64) -> Result<String, String> {
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| format!("bind loopback: {e}"))?;
    listener
        .set_nonblocking(true)
        .map_err(|e| format!("nonblocking: {e}"))?;

    let port = listener
        .local_addr()
        .map_err(|e| format!("local_addr: {e}"))?
        .port();
    let redirect_uri = format!("http://127.0.0.1:{port}{CALLBACK_PATH}");

    app.emit("oauth-loopback-ready", redirect_uri.clone())
        .map_err(|e| format!("emit: {e}"))?;

    let timeout = Duration::from_millis(timeout_ms.max(1_000));

    tauri::async_runtime::spawn_blocking(move || accept_oauth_callback(listener, port, timeout))
        .await
        .map_err(|e| format!("join: {e}"))?
}

/// Échange le code OAuth contre un `id_token` côté native (évite le CORS WebView).
/// Les clients « Application de bureau » Google ont souvent un Client secret affiché
/// dans la console ; le token endpoint peut l’exiger même avec PKCE.
#[tauri::command]
async fn google_exchange_code(
    client_id: String,
    code: String,
    code_verifier: String,
    redirect_uri: String,
    client_secret: Option<String>,
) -> Result<String, String> {
    #[derive(Deserialize)]
    struct TokenResponse {
        id_token: Option<String>,
        error: Option<String>,
        error_description: Option<String>,
    }

    let mut form = vec![
        ("client_id", client_id.clone()),
        ("code", code.clone()),
        ("code_verifier", code_verifier.clone()),
        ("grant_type", "authorization_code".to_string()),
        ("redirect_uri", redirect_uri.clone()),
    ];
    if let Some(secret) = client_secret.filter(|s| !s.trim().is_empty()) {
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

fn accept_oauth_callback(listener: TcpListener, port: u16, timeout: Duration) -> Result<String, String> {
    let started = Instant::now();

    loop {
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
        builder = builder.plugin(tauri_plugin_single_instance::init(|_app, argv, _cwd| {
            println!("single-instance: {argv:?}");
        }));
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![oauth_loopback_wait, google_exchange_code])
        .setup(|app| {
            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all()?;
            }
            let _ = app;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Spend.Up");
}
