# Risorse Talia

- Il manifesto `talia-extension.json` e i file del pacchetto sono la fonte di verità. Mantieni ID stabili, versione SemVer, licenza, provenienza e dipendenze esplicite.
- Riusa i template e gli strumenti pubblici di `talia-store`. Il contributore deve poter validare le risorse senza il repository privato del core.
- Controlli locali `npm test` e `npm run validate`. La CI delle pull request non riceve segreti di pubblicazione.
- I pacchetti non contengono credenziali o percorsi personali. Installazione e consultazione non avviano processi MCP. Provider e account sono configurati dall'utente nell'host.
- Prima di modificare cerca logiche e pacchetti simili e consulta simboli e riferimenti nel grafo, verificando copertura e freschezza. Il repository rimane autorevole.
- Commenti in italiano, identificatori del codice in inglese. Mantieni i sorgenti leggibili e gli esempi realmente utilizzabili.
- Per modifiche ai contratti comuni prepara una proposta nel repository dello store e coordina l'adattamento dell'host. Un normale nuovo pacchetto usa il contratto esistente.
- Gli indici locali hanno un nome derivato dalla root canonica e non vengono uniti a quelli di altri repository. `.cbmignore` esclude output, artefatti generati e dati privati.
