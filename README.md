# TUSHAR SIM MANAGER — GitHub Pages V6

Static GitHub Pages project for the existing Firebase-connected Tushar SIM Management System.

## V6 changes
- Functional category counter shortcuts.
- Three-dot category menu with live record counts.
- Functional mobile Search / Wanted / List / Backup navigation.
- Exclusive view switching between Wanted, List and Backup panels.
- Updated service-worker cache version.

## Update the existing local repository
1. Extract this ZIP.
2. Copy all contents into `Documents/GitHub/tushar-sim-manager/`, replacing existing site files.
3. Keep the `.git` folder untouched.
4. In GitHub Desktop, commit and Push origin.
5. GitHub Pages is configured to publish `main` from `/(root)`.

## Security
- Never commit SIM/customer backups, JSON/CSV exports, passwords or private customer data to this public repository.
- `firebase-config.js` contains the public Firebase Web App configuration. Firestore Security Rules and Firebase Authentication protect the database.
- Existing Firebase project and cloud records are reused. Do not re-import the backup during a UI update.
