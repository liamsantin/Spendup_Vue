use std::fs;
use std::path::PathBuf;

fn main() {
    embed_google_desktop_secret();
    tauri_build::build()
}

/// Lit le secret Desktop depuis l’env process ou le `.env` du front (sans le passer au WebView).
fn embed_google_desktop_secret() {
    println!("cargo:rerun-if-env-changed=GOOGLE_DESKTOP_CLIENT_SECRET");
    println!("cargo:rerun-if-env-changed=VITE_GOOGLE_DESKTOP_CLIENT_SECRET");

    let mut secret = std::env::var("GOOGLE_DESKTOP_CLIENT_SECRET")
        .or_else(|_| std::env::var("VITE_GOOGLE_DESKTOP_CLIENT_SECRET"))
        .unwrap_or_default();

    if secret.trim().is_empty() {
        if let Some(from_dotenv) = read_dotenv_secret() {
            secret = from_dotenv;
        }
    }

    let secret = secret.trim();
    // Toujours définir (éventuellement vide) pour que option_env! soit stable.
    println!("cargo:rustc-env=GOOGLE_DESKTOP_CLIENT_SECRET={secret}");
    if let Some(env_path) = dotenv_path() {
        println!("cargo:rerun-if-changed={}", env_path.display());
    }
}

fn dotenv_path() -> Option<PathBuf> {
    let manifest = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").ok()?);
    let candidate = manifest.join("../.env");
    candidate.exists().then_some(candidate)
}

fn read_dotenv_secret() -> Option<String> {
    let path = dotenv_path()?;
    let contents = fs::read_to_string(path).ok()?;
    for line in contents.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let (key, value) = line.split_once('=')?;
        let key = key.trim();
        if key != "GOOGLE_DESKTOP_CLIENT_SECRET" && key != "VITE_GOOGLE_DESKTOP_CLIENT_SECRET" {
            continue;
        }
        let value = value.trim().trim_matches('"').trim_matches('\'').trim();
        if !value.is_empty() {
            return Some(value.to_string());
        }
    }
    None
}
