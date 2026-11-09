# Talia Apps

Public SDK v1 app bundles for the Talia extension store. The examples are `notes`, `task-board`, and `csv-viewer`. Each app uses the declared Web App SDK contract, includes a bundled `orkas-app.json`, and ships with a local fixture or data definition.

The data SDK v1 supports reads and inserts but no record updates or deletes; the task board states this limit in its UI. The CSV viewer reads only a bundled fixture and does not access the user's filesystem.

Repository: https://github.com/Talia-orchestator/talia-apps

Run npm test to validate the SDK manifests, CSV fixture parser, package licenses, and installable bundle artifacts. Pull requests use the same secrets-free check.

## Contratto SDK pubblico

Il riferimento dei manifest, delle capability e dei metodi SDK si trova in [docs/sdk-v1.json](docs/sdk-v1.json). È esportato dal contratto dell’host Talia e permette di sviluppare le app senza accesso al repository privato del core. Gli esempi Notes e Task Board mostrano persistenza e revisioni con le operazioni disponibili; CSV Viewer mostra l’importazione locale scelta dall’utente.
