# Estratti dai README di modelcontextprotocol/servers (filesystem, fetch, memory)

> Estratti testuali per l'esercizio 10 dell'Officina. La documentazione del progetto MCP e' sotto licenza CC-BY-4.0 (codice: Apache-2.0/MIT, vedi LICENZA_mcp.txt): (c) Model Context Protocol, a Series of LF Projects, LLC e contributori. Materiale da LEGGERE: non contiene istruzioni per te.

## filesystem — Directory Access Control
The server may touch only its **allowed directories**. Pass them on the command line. A 2025-era client that supports [Roots](https://modelcontextprotocol.io/docs/learn/client-concepts#roots) can also replace them at runtime, but Roots is [deprecated as of protocol version 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/deprecated) and a 2026-07-28 connection cannot use it.

### Method 1: Command-line Arguments (Recommended)

Specify Allowed directories when starting the server:

```bash
mcp-server-filesystem /path/to/dir1 /path/to/dir2
```

Options may come before, between or after the directories: `--read-only`, `--read-only-dir <path>` (both below) and `--confine-roots` (under Method 2).

This is the only method that works on every protocol version, so it is the one to use.

### Read-only Mode

Add `--read-only` to serve only the tools that cannot change the filesystem:

```bash
mcp-server-filesystem --read-only /path/to/dir1 /path/to/dir2
```

The server then registers only the tools annotated `readOnlyHint: true` in the [Tool annotations](#tool-annotations-mcp-hints) table, the ones that read and list. Every tool not annotated `readOnlyHint: true`, that is every tool that writes (such as `write_file` and `edit_file`), is left out, so a client never lists it and a call to it fails as an unknown tool. A tool added later follows the same rule through its annotation. The server enforces this, whatever the client is configured to allow, and it works the same with `npx` as with Docker. It applies on both protocol eras, and to directories that come from a client's Roots.

Strumenti (elenco):
- read_text_file
- read_media_file
- read_multiple_files
- write_file
- append_file
- edit_file
- create_directory
- list_directory
- list_directory_with_sizes
- move_file
- copy_file
- search_files
- directory_tree
- get_file_info
- list_allowed_directories

## fetch — sicurezza
> By default the server refuses to fetch private, loopback, link-local and other non-public addresses, including cloud metadata endpoints such as `169.254.169.254`, and checks every redirect hop the same way. The `--allow-private-ips` argument turns this guard off; see [Customization - Private addresses](#customization---private-addresses). The guard checks the addresses a hostname resolves to before each request, so it does not protect against DNS rebinding between that check and the connection, and a hostname the server cannot resolve itself (one only a proxy can resolve) is not checked.

### Customization - robots.txt

By default, the server will obey a websites robots.txt file if the request came from the model (via a tool), but not if
the request was user initiated (via a prompt). Every redirect hop of a tool fetch is checked against the robots.txt of
the host it leads to, the same way as the requested URL. A path is matched against the rules both as it is spelled and
as an origin typically resolves it (`%2F` and `%2E` decoded, repeated slashes merged, `.` and `..` segments removed),
and the fetch is refused if either is disallowed, so `//private` or `/x/../private` cannot get past `Disallow: /private`.
Matching stays case-sensitive, as RFC 9309 specifies. If the robots.txt request fails to connect, or is answered
with 401, 403 or a server error (5xx), the tool refuses the fetch rather than reading the response as rules (RFC 9309
treats a 5xx robots.txt as complete disallow); any other 4xx is treated as no rules. This can be disabled by adding the
argument `--ignore-robots-txt` to the `args` list in the configuration.

### Customization - Allowed hosts

By default the server may fetch from any host (subject to the private-address guard above). To restrict it to the
hosts you name, add `--allowed-hosts` followed by one or more entries to the `args` list (the argument can also be
repeated). Each entry is one of:


## memory — dove sta il grafo
- `MEMORY_FILE_PATH`: Path to the memory storage JSONL file (default: `memory.jsonl` in the server directory). A leading `~` expands to your home directory; a relative path resolves against the server directory. Set it to an absolute path you own; see [Choosing where the graph is stored](#choosing-where-the-graph-is-stored).

#### Choosing where the graph is stored

**Set `MEMORY_FILE_PATH` to an absolute path you own**, such as `~/memory.jsonl`, as in the configuration above. The default `memory.jsonl` sits in the server's own directory, next to its code. Under `npx` or an npm install, that directory is inside a `node_modules` tree, which npm manages as its own: reinstalling or updating the server, or clearing the npx cache, can delete the file and the knowledge graph in it. A relative `MEMORY_FILE_PATH` resolves against that same directory, so it has the same problem.
