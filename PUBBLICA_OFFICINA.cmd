@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem =====================================================================================
rem  PUBBLICA_OFFICINA.cmd - pubblica il repo dello studente dell'Officina su GitHub
rem
rem  Cosa fa (Windows 10/11, doppio clic o da prompt dei comandi):
rem    1. controlla che codespaces_modello\ sia allineata alle fonti (se Python c'e');
rem    2. crea il repo GITHUB_UTENTE/NOME_REPO se non esiste (con gh se installato, altrimenti con curl);
rem    3. ci copia il contenuto di codespaces_modello\ e fa commit + push sul ramo main (git via HTTPS).
rem  Rilanciarlo e' sicuro: se il repo esiste lo aggiorna con un nuovo commit (mai un push forzato).
rem
rem  IL TOKEN NON VIENE MAI STAMPATO: non compare nei messaggi, non va nell'URL del remoto, non resta
rem  nella configurazione di git (lo legge un aiutante delle credenziali da una variabile d'ambiente
rem  che vive solo finche' questa finestra e' aperta).
rem =====================================================================================

rem ------------------------------ DOVE INNESTARE LE CREDENZIALI ------------------------------
rem  1) Crea un token su GitHub, accedendo come FranceGit:
rem       Settings > Developer settings > Personal access tokens > Fine-grained tokens > Generate new token
rem       - Resource owner: FranceGit
rem       - Repository access: "All repositories" la prima volta (serve per CREARE il repo);
rem         dalle volte successive basta "Only select repositories" > corso-officina
rem       - Permissions > Repository permissions: Administration = Read and write (creazione),
rem                                              Contents = Read and write (push)
rem       - Scadenza breve (7 giorni): e' un token usa-e-getta.
rem     In alternativa un token "classic" con lo scope "repo".
rem  2) Incolla il token qui sotto AL POSTO di <INCOLLA_QUI_IL_TOKEN_GITHUB> (niente spazi, niente virgolette),
rem     salva, lancia il file. Poi RIMETTI il segnaposto (o cancella il token su GitHub): non lasciarlo nel file.
rem     Alternativa piu' pulita: lascia il segnaposto e imposta prima, nello stesso prompt,
rem        set OFFICINA_GITHUB_TOKEN=il_tuo_token
rem     poi lancia PUBBLICA_OFFICINA.cmd: la variabile ha la precedenza sul valore scritto qui.
rem  3) Questo file NON va mai committato con il token dentro.
set "OFFICINA_TOKEN=<INCOLLA_QUI_IL_TOKEN_GITHUB>"

rem ------------------------------ PARAMETRI (di solito non si toccano) ------------------------------
rem  GITHUB_UTENTE: il profilo GitHub di France. NOME_REPO: il repo che gli studenti apriranno in Codespaces.
rem  VISIBILITA: private (predefinito). _why: il repo contiene la copia del CRM patowari, che NON ha una licenza
rem  esplicita (vedi codespaces_modello\officina\o2\PROVENIENZA.md): pubblico solo dopo il permesso dell'autore.
rem  Con un repo privato gli studenti vanno invitati come collaboratori (Settings > Collaborators).
rem  AUTORE_EMAIL: indirizzo "noreply" di GitHub, cosi' l'email vera non finisce nella storia del repo.
set "GITHUB_UTENTE=FranceGit"
set "NOME_REPO=corso-officina"
set "VISIBILITA=private"
set "AUTORE_NOME=FranceGit"
set "AUTORE_EMAIL=FranceGit@users.noreply.github.com"
set "DESCRIZIONE=Officina del corso agenti AI: esercizi pratici e assistente libero, pronto per GitHub Codespaces"

rem =====================================================================================
cd /d "%~dp0"
set "SORGENTE=%~dp0codespaces_modello"
set "GIT_TERMINAL_PROMPT=0"
set "GCM_INTERACTIVE=never"

if defined OFFICINA_GITHUB_TOKEN set "OFFICINA_TOKEN=%OFFICINA_GITHUB_TOKEN%"
if "%OFFICINA_TOKEN%"=="<INCOLLA_QUI_IL_TOKEN_GITHUB>" goto :manca_token
if "%OFFICINA_TOKEN%"=="" goto :manca_token

if not exist "%SORGENTE%\.devcontainer\devcontainer.json" (
  echo ERRORE: non trovo codespaces_modello\.devcontainer\devcontainer.json accanto a questo file.
  echo Lancia PUBBLICA_OFFICINA.cmd dalla radice del progetto Corso_Agenti_Web.
  goto :fine_errore
)
where git >nul 2>&1
if errorlevel 1 (
  echo ERRORE: git non e' installato o non e' nel PATH. Installa "Git for Windows" da git-scm.com e riprova.
  goto :fine_errore
)

echo [1/4] Controllo che codespaces_modello sia allineata alle fonti...
where python >nul 2>&1
if errorlevel 1 (
  echo       Python non trovato: controllo saltato. Il contenuto pubblicato e' quello gia' presente nella cartella.
) else (
  python strumenti\prepara_codespaces.py --verifica >nul 2>&1
  if errorlevel 1 (
    echo ERRORE: codespaces_modello non e' allineata alle fonti. Rigenerala con:
    echo        python strumenti\prepara_codespaces.py
    goto :fine_errore
  )
  echo       allineata.
)

echo [2/4] Controllo o creo il repo %GITHUB_UTENTE%/%NOME_REPO% ...
where gh >nul 2>&1
if errorlevel 1 goto :crea_con_curl

:crea_con_gh
set "GH_TOKEN=%OFFICINA_TOKEN%"
set "GH_PROMPT_DISABLED=1"
gh repo view "%GITHUB_UTENTE%/%NOME_REPO%" >nul 2>&1
if not errorlevel 1 (
  echo       il repo esiste gia': lo aggiorno.
  goto :pubblica
)
gh repo create "%GITHUB_UTENTE%/%NOME_REPO%" --%VISIBILITA% --description "%DESCRIZIONE%" >nul 2>&1
if errorlevel 1 (
  echo ERRORE: gh non e' riuscito a creare il repo. Il token ha il permesso Administration = Read and write
  echo        su "All repositories"? E' scaduto? Il nome %NOME_REPO% e' gia' usato da un altro tipo di risorsa?
  goto :fine_errore
)
echo       repo creato con gh.
goto :pubblica

:crea_con_curl
where curl >nul 2>&1
if errorlevel 1 (
  echo ERRORE: non trovo ne' gh ne' curl. Installa GitHub CLI da cli.github.com oppure usa Windows 10/11 aggiornato.
  goto :fine_errore
)
set "CODICE="
for /f "usebackq delims=" %%c in (`curl -s -o NUL -w "%%{http_code}" -H "Authorization: Bearer %OFFICINA_TOKEN%" -H "Accept: application/vnd.github+json" "https://api.github.com/repos/%GITHUB_UTENTE%/%NOME_REPO%"`) do set "CODICE=%%c"
if "%CODICE%"=="200" (
  echo       il repo esiste gia': lo aggiorno.
  goto :pubblica
)
if "%CODICE%"=="401" goto :token_rifiutato
if not "%CODICE%"=="404" (
  echo ERRORE: GitHub ha risposto %CODICE% alla verifica del repo. Rete assente o token senza permessi?
  goto :fine_errore
)
set "PRIVATO=true"
if /i "%VISIBILITA%"=="public" set "PRIVATO=false"
set "RICHIESTA=%TEMP%\officina_crea_repo_%RANDOM%.json"
> "%RICHIESTA%" echo {"name":"%NOME_REPO%","private":%PRIVATO%,"is_template":true,"has_wiki":false,"description":"%DESCRIZIONE%"}
set "CODICE="
for /f "usebackq delims=" %%c in (`curl -s -o NUL -w "%%{http_code}" -X POST -H "Authorization: Bearer %OFFICINA_TOKEN%" -H "Accept: application/vnd.github+json" --data-binary "@%RICHIESTA%" "https://api.github.com/user/repos"`) do set "CODICE=%%c"
del "%RICHIESTA%" >nul 2>&1
if "%CODICE%"=="201" (
  echo       repo creato con l'API di GitHub.
  goto :pubblica
)
if "%CODICE%"=="401" goto :token_rifiutato
echo ERRORE: creazione del repo non riuscita (HTTP %CODICE%). 403 = al token manca Administration = Read and write
echo        su "All repositories"; 422 = esiste gia' una risorsa con quel nome.
goto :fine_errore

:pubblica
echo [3/4] Preparo la copia di lavoro...
set "LAVORO=%TEMP%\corso-officina-pubblica-%RANDOM%%RANDOM%"
set "AIUTANTE=!f() { echo username=x-access-token; echo password=$OFFICINA_TOKEN; }; f"
git -c credential.helper= -c "credential.helper=%AIUTANTE%" clone --quiet "https://github.com/%GITHUB_UTENTE%/%NOME_REPO%.git" "%LAVORO%" >nul 2>&1
if errorlevel 1 (
  echo ERRORE: git non riesce a scaricare il repo. Il token ha Contents = Read and write su %NOME_REPO%?
  goto :fine_errore
)
robocopy "%SORGENTE%" "%LAVORO%" /MIR /XD .git __pycache__ .pytest_cache consegne /XF *.pyc /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 (
  echo ERRORE: copia dei file non riuscita ^(robocopy^).
  goto :fine_errore
)
pushd "%LAVORO%"
git add -A
git diff --cached --quiet
if not errorlevel 1 (
  echo       nessuna modifica rispetto al repo pubblicato: niente da inviare.
  popd
  goto :fine_ok
)
git -c "user.name=%AUTORE_NOME%" -c "user.email=%AUTORE_EMAIL%" commit --quiet -m "Officina: pubblicazione del modello per Codespaces (%DATE%)"
if errorlevel 1 (
  echo ERRORE: commit non riuscito.
  popd
  goto :fine_errore
)
git branch -M main
echo [4/4] Invio a GitHub...
git -c credential.helper= -c "credential.helper=%AIUTANTE%" push --quiet -u origin main >nul 2>&1
if errorlevel 1 (
  echo ERRORE: push non riuscito. Il token ha Contents = Read and write? Il ramo main e' protetto?
  popd
  goto :fine_errore
)
popd

:fine_ok
if defined LAVORO if exist "%LAVORO%" rmdir /s /q "%LAVORO%"
echo.
echo FATTO: https://github.com/%GITHUB_UTENTE%/%NOME_REPO%
echo Passi successivi:
echo  - Codespaces: pulsante Code ^> Codespaces ^> Create codespace (macchina da 2 core).
echo  - Groq (facoltativo): Settings ^> Codespaces ^> Secrets ^> New secret GROQ_API_KEY, accesso al repo %NOME_REPO%.
echo  - Repo privato: invita gli studenti in Settings ^> Collaborators (oppure, con il permesso dell'autore del CRM, rendilo pubblico).
echo  - Rimetti il segnaposto al posto del token in questo file.
set "OFFICINA_TOKEN="
set "GH_TOKEN="
endlocal
pause
exit /b 0

:manca_token
echo ERRORE: manca il token GitHub.
echo Apri PUBBLICA_OFFICINA.cmd con il Blocco note e sostituisci il segnaposto INCOLLA_QUI_IL_TOKEN_GITHUB
echo (riga set "OFFICINA_TOKEN=...") con il token di FranceGit, oppure imposta prima la variabile OFFICINA_GITHUB_TOKEN.
goto :fine_errore

:token_rifiutato
echo ERRORE: GitHub ha rifiutato il token (HTTP 401): e' scaduto, revocato o copiato male.
goto :fine_errore

:fine_errore
if defined LAVORO if exist "%LAVORO%" rmdir /s /q "%LAVORO%"
set "OFFICINA_TOKEN="
set "GH_TOKEN="
endlocal
pause
exit /b 1
