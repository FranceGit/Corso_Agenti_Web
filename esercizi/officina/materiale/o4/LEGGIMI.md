# O4 — MCP in pratica

Scrivi `mcp.json` (configurazione del client MCP) per tre server di riferimento: filesystem, fetch, memory.
Regola del recinto: il server filesystem vede SOLO la cartella `officina/o4/dati` del repo
(in Codespaces: `/workspaces/<nome-del-repo>/officina/o4/dati`), la memoria vive in un file `.jsonl` dentro il repo
(`officina/o4/memoria/memoria.jsonl`, percorso assoluto), fetch resta con le protezioni predefinite.
Versioni dei pacchetti fissate: `@modelcontextprotocol/server-filesystem@<versione>` per npx (la versione la trovi
con `npm view @modelcontextprotocol/server-filesystem version`) e `mcp-server-fetch==<versione>` per uvx.
