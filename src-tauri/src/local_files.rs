//! Dossier local des PDF (synchro façon drive).
//!
//! Le webview n'a aucun accès disque générique : il passe par ces commandes, qui ne travaillent que dans
//! `<racine>/<compte>/`, avec un nom de fichier validé (pas de séparateur, pas de `..`, extension `.pdf` ou `.spdf`).
//! La racine est choisie par l'utilisateur (sélecteur natif) et mémorisée dans `file-sync.json` du dossier de config
//! de l'app ; par défaut `Documents/Spend.Up`. Les suppressions venues d'un autre appareil vont dans `.corbeille/`.

use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::ipc::{InvokeBody, Request, Response};
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;

const CONFIG_FILE: &str = "file-sync.json";
const DEFAULT_FOLDER: &str = "Spend.Up";
const TRASH_DIR: &str = ".corbeille";
const INDEX_FILE: &str = ".spendup-index.json";
const TMP_SUFFIX: &str = ".tmp";
const MAX_NAME_LEN: usize = 200;

#[derive(Default, Serialize, Deserialize)]
struct SyncConfig {
    root: Option<String>,
}

/// Fichier présent dans le dossier du compte.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalEntry {
    name: String,
    size: u64,
    modified_ms: u64,
}

/// Résultat d'une écriture : empreinte SHA-256 relue sur le disque.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WriteResult {
    sha256: String,
    size: u64,
}

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(CONFIG_FILE))
}

fn read_config(app: &AppHandle) -> SyncConfig {
    config_path(app)
        .ok()
        .and_then(|p| fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn write_config(app: &AppHandle, config: &SyncConfig) -> Result<(), String> {
    let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(config_path(app)?, json).map_err(|e| e.to_string())
}

fn default_root(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .document_dir()
        .or_else(|_| app.path().app_local_data_dir())
        .map_err(|e| e.to_string())?;
    Ok(base.join(DEFAULT_FOLDER))
}

fn root(app: &AppHandle) -> Result<PathBuf, String> {
    match read_config(app).root {
        Some(r) if !r.trim().is_empty() => Ok(PathBuf::from(r)),
        _ => default_root(app),
    }
}

/// Identifiant public du compte : lettres et chiffres seulement.
fn validate_account(account: &str) -> Result<(), String> {
    if account.is_empty() || account.len() > 64 || !account.chars().all(|c| c.is_ascii_alphanumeric()) {
        return Err("Compte invalide.".into());
    }
    Ok(())
}

/// Nom de fichier simple dans le dossier du compte : pas de chemin, pas de fichier caché, extension PDF.
fn validate_name(name: &str) -> Result<(), String> {
    let lower = name.to_lowercase();
    let invalid = name.is_empty()
        || name.chars().count() > MAX_NAME_LEN
        || name.starts_with('.')
        || name.ends_with(' ')
        || name.contains("..")
        || name.chars().any(|c| c.is_control() || "<>:\"/\\|?*".contains(c))
        || !(lower.ends_with(".pdf") || lower.ends_with(".spdf"));
    if invalid {
        return Err("Nom de fichier invalide.".into());
    }
    Ok(())
}

/// Dossier du compte, créé au besoin. Refuse si la racine est introuvable (disque amovible débranché) :
/// une absence ne doit jamais passer pour une suppression.
fn account_dir(app: &AppHandle, account: &str) -> Result<PathBuf, String> {
    validate_account(account)?;
    let root = root(app)?;
    if !root.exists() {
        if read_config(app).root.is_some() {
            return Err("ROOT_UNAVAILABLE".into());
        }
        fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    }
    let dir = root.join(account);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn file_path(app: &AppHandle, account: &str, name: &str) -> Result<PathBuf, String> {
    validate_name(name)?;
    Ok(account_dir(app, account)?.join(name))
}

fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

fn sha256_file(path: &Path) -> Result<(String, u64), String> {
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    let digest = Sha256::digest(&bytes);
    Ok((digest.iter().map(|b| format!("{b:02x}")).collect(), bytes.len() as u64))
}

/// Décode un en-tête encodé avec `encodeURIComponent` (les en-têtes IPC sont ASCII).
fn percent_decode(value: &str) -> Result<String, String> {
    let bytes = value.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' {
            if i + 2 >= bytes.len() {
                return Err("Encodage invalide.".into());
            }
            let hex = std::str::from_utf8(&bytes[i + 1..i + 3]).map_err(|e| e.to_string())?;
            out.push(u8::from_str_radix(hex, 16).map_err(|_| "Encodage invalide.".to_string())?);
            i += 3;
        } else {
            out.push(bytes[i]);
            i += 1;
        }
    }
    String::from_utf8(out).map_err(|_| "Encodage invalide.".into())
}

fn header(request: &Request<'_>, key: &str) -> Result<String, String> {
    let raw = request
        .headers()
        .get(key)
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| format!("En-tête {key} manquant."))?;
    percent_decode(raw)
}

/// Racine actuelle et indicateur « choisie par l'utilisateur ».
#[tauri::command]
pub fn local_files_get_root(app: AppHandle) -> Result<(String, bool, bool), String> {
    let configured = read_config(&app).root.is_some();
    let root = root(&app)?;
    let available = root.exists() || !configured;
    Ok((root.to_string_lossy().into_owned(), configured, available))
}

/// Ouvre le sélecteur natif de dossier ; `None` si l'utilisateur annule.
#[tauri::command]
pub async fn local_files_pick_root(app: AppHandle) -> Result<Option<String>, String> {
    let picked = app.dialog().file().set_title("Dossier des documents Spend.Up").blocking_pick_folder();
    Ok(picked.and_then(|p| p.into_path().ok()).map(|p| p.to_string_lossy().into_owned()))
}

fn copy_dir(from: &Path, to: &Path) -> Result<(), String> {
    fs::create_dir_all(to).map_err(|e| e.to_string())?;
    for entry in fs::read_dir(from).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let target = to.join(entry.file_name());
        if entry.file_type().map_err(|e| e.to_string())?.is_dir() {
            copy_dir(&entry.path(), &target)?;
        } else {
            fs::copy(entry.path(), &target).map_err(|e| e.to_string())?;
            let (a, _) = sha256_file(&entry.path())?;
            let (b, _) = sha256_file(&target)?;
            if a != b {
                return Err(format!("Copie altérée : {}", target.display()));
            }
        }
    }
    Ok(())
}

/// Change la racine. Avec `move_account`, déplace le dossier de ce compte (renommage, sinon copie vérifiée puis
/// suppression de l'ancien). Refuse une racine incluse dans l'ancienne, ou l'inverse.
#[tauri::command]
pub async fn local_files_set_root(
    app: AppHandle,
    path: String,
    move_account: Option<String>,
) -> Result<String, String> {
    let new_root = PathBuf::from(path.trim());
    if !new_root.is_absolute() {
        return Err("Le dossier doit être un chemin absolu.".into());
    }
    fs::create_dir_all(&new_root).map_err(|e| e.to_string())?;
    let new_root = new_root.canonicalize().map_err(|e| e.to_string())?;
    let old_root = root(&app)?;

    if let Some(account) = move_account {
        validate_account(&account)?;
        let old_canon = old_root.canonicalize().unwrap_or(old_root.clone());
        if old_canon != new_root {
            if new_root.starts_with(&old_canon) || old_canon.starts_with(&new_root) {
                return Err("Le nouveau dossier ne peut pas être dans l'ancien, ni l'inverse.".into());
            }
            let from = old_canon.join(&account);
            let to = new_root.join(&account);
            if from.exists() {
                if to.exists() && fs::read_dir(&to).map(|mut d| d.next().is_some()).unwrap_or(false) {
                    return Err("Le nouveau dossier contient déjà des documents pour ce compte.".into());
                }
                if fs::rename(&from, &to).is_err() {
                    copy_dir(&from, &to)?;
                    fs::remove_dir_all(&from).map_err(|e| e.to_string())?;
                }
            }
        }
    }

    write_config(&app, &SyncConfig { root: Some(new_root.to_string_lossy().into_owned()) })?;
    Ok(new_root.to_string_lossy().into_owned())
}

/// Fichiers PDF du dossier du compte (ni dossiers, ni fichiers cachés, ni temporaires).
#[tauri::command]
pub fn local_files_list(app: AppHandle, account: String) -> Result<Vec<LocalEntry>, String> {
    let dir = account_dir(&app, &account)?;
    let mut out = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().into_owned();
        let meta = entry.metadata().map_err(|e| e.to_string())?;
        if !meta.is_file() || validate_name(&name).is_err() {
            continue;
        }
        let modified_ms = meta
            .modified()
            .ok()
            .and_then(|m| m.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);
        out.push(LocalEntry { name, size: meta.len(), modified_ms });
    }
    Ok(out)
}

/// Lit un fichier du compte (réponse binaire, sans passer par JSON).
#[tauri::command]
pub fn local_files_read(app: AppHandle, account: String, name: String) -> Result<Response, String> {
    let path = file_path(&app, &account, &name)?;
    let bytes = fs::read(&path).map_err(|_| "NOT_FOUND".to_string())?;
    Ok(Response::new(bytes))
}

/// Écrit un fichier de façon atomique (`.tmp` puis renommage) et renvoie l'empreinte relue sur le disque.
/// Corps binaire brut ; en-têtes `x-account` et `x-name` encodés avec `encodeURIComponent`.
#[tauri::command]
pub fn local_files_write(app: AppHandle, request: Request<'_>) -> Result<WriteResult, String> {
    let account = header(&request, "x-account")?;
    let name = header(&request, "x-name")?;
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err("Corps binaire attendu.".into());
    };
    let path = file_path(&app, &account, &name)?;
    let tmp = path.with_file_name(format!(".{name}{TMP_SUFFIX}"));
    {
        let mut file = fs::File::create(&tmp).map_err(|e| e.to_string())?;
        file.write_all(bytes).map_err(|e| e.to_string())?;
        file.sync_all().map_err(|e| e.to_string())?;
    }
    let (sha256, size) = sha256_file(&tmp)?;
    fs::rename(&tmp, &path).map_err(|e| {
        let _ = fs::remove_file(&tmp);
        e.to_string()
    })?;
    Ok(WriteResult { sha256, size })
}

/// Empreinte SHA-256 d'un fichier du compte (contrôle d'intégrité).
#[tauri::command]
pub fn local_files_hash(app: AppHandle, account: String, name: String) -> Result<WriteResult, String> {
    let path = file_path(&app, &account, &name)?;
    if !path.exists() {
        return Err("NOT_FOUND".into());
    }
    let (sha256, size) = sha256_file(&path)?;
    Ok(WriteResult { sha256, size })
}

/// Renomme un fichier du compte (nom lisible changé, passage chiffré ↔ clair).
#[tauri::command]
pub fn local_files_rename(app: AppHandle, account: String, from: String, to: String) -> Result<(), String> {
    let source = file_path(&app, &account, &from)?;
    let target = file_path(&app, &account, &to)?;
    if target.exists() {
        return Err("Un fichier porte déjà ce nom.".into());
    }
    fs::rename(source, target).map_err(|e| e.to_string())
}

/// Supprime un fichier du compte. Avec `to_trash`, le déplace dans `.corbeille/` (préfixé de l'horodatage).
#[tauri::command]
pub fn local_files_delete(app: AppHandle, account: String, name: String, to_trash: bool) -> Result<(), String> {
    let path = file_path(&app, &account, &name)?;
    if !path.exists() {
        return Ok(());
    }
    if to_trash {
        let trash = account_dir(&app, &account)?.join(TRASH_DIR);
        fs::create_dir_all(&trash).map_err(|e| e.to_string())?;
        fs::rename(&path, trash.join(format!("{}_{name}", now_ms()))).map_err(|e| e.to_string())
    } else {
        fs::remove_file(path).map_err(|e| e.to_string())
    }
}

/// Vide la corbeille des éléments plus vieux que `max_age_days`. Renvoie le nombre de fichiers supprimés.
#[tauri::command]
pub fn local_files_purge_trash(app: AppHandle, account: String, max_age_days: u64) -> Result<u32, String> {
    let trash = account_dir(&app, &account)?.join(TRASH_DIR);
    if !trash.exists() {
        return Ok(0);
    }
    let limit = Duration::from_secs(max_age_days * 24 * 3600);
    let mut removed = 0;
    for entry in fs::read_dir(&trash).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let old = entry
            .metadata()
            .and_then(|m| m.modified())
            .ok()
            .and_then(|m| m.elapsed().ok())
            .map(|age| age > limit)
            .unwrap_or(false);
        if old && fs::remove_file(entry.path()).is_ok() {
            removed += 1;
        }
    }
    Ok(removed)
}

/// Lit l'index de synchro du compte (JSON géré par le front), ou `None`.
#[tauri::command]
pub fn local_files_read_index(app: AppHandle, account: String) -> Result<Option<String>, String> {
    let path = account_dir(&app, &account)?.join(INDEX_FILE);
    Ok(fs::read_to_string(path).ok())
}

/// Écrit l'index de synchro du compte (atomique).
#[tauri::command]
pub fn local_files_write_index(app: AppHandle, account: String, json: String) -> Result<(), String> {
    serde_json::from_str::<serde_json::Value>(&json).map_err(|_| "Index JSON invalide.".to_string())?;
    let dir = account_dir(&app, &account)?;
    let tmp = dir.join(format!("{INDEX_FILE}{TMP_SUFFIX}"));
    fs::write(&tmp, json).map_err(|e| e.to_string())?;
    fs::rename(&tmp, dir.join(INDEX_FILE)).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_plain_pdf_names() {
        assert!(validate_name("Relevé UBS mars 2026__a1b2c3d4.pdf").is_ok());
        assert!(validate_name("0f8e5a2c-1111-4222-8333-944445555666.spdf").is_ok());
    }

    #[test]
    fn rejects_paths_hidden_and_other_extensions() {
        for bad in [
            "",
            "../x.pdf",
            "a/b.pdf",
            "a\\b.pdf",
            ".spendup-index.json",
            ".cache.pdf",
            "x.exe",
            "x.pdf ",
            "C:x.pdf",
            "a..b.pdf",
        ] {
            assert!(validate_name(bad).is_err(), "{bad}");
        }
        assert!(validate_name(&format!("{}.pdf", "a".repeat(MAX_NAME_LEN))).is_err());
    }

    #[test]
    fn validates_account() {
        assert!(validate_account("Ab12Cd3").is_ok());
        assert!(validate_account("../x").is_err());
        assert!(validate_account("").is_err());
    }

    #[test]
    fn decodes_percent_encoding() {
        assert_eq!(percent_decode("Relev%C3%A9%20mars.pdf").unwrap(), "Relevé mars.pdf");
        assert_eq!(percent_decode("plain.pdf").unwrap(), "plain.pdf");
        assert!(percent_decode("%ZZ.pdf").is_err());
    }
}
