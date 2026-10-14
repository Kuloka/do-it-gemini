# do-it-gemini

18 Gemini-compatible skills, three plugin packs, and a persistent mini chat for
Windows CMD. Version 0.1.1 supports Antigravity CLI (`agy`), Google's successor for
personal Gemini CLI access, as well as eligible Gemini CLI and API installations.
The skills adapt practical Codex/oh-my-codex workflows to Gemini rather than simply
renaming them. Codex goal APIs, OMX runtime, and tmux assumptions are replaced
with available Gemini capabilities and explicit limits.

## One-command launch

Install Node.js 20 or newer, open CMD, and run:

```cmd
npx -y do-it-gemini@latest
```

This command downloads the package from npm. You do not need a Git clone,
a publisher account, or npm two-factor authentication to install it.
Node.js includes npm/npx. See [PUBLISH.md](../PUBLISH.md) for maintainer instructions.

The default npm entrypoint runs `bootstrap` and prepares a persistent workspace.
If Antigravity CLI is installed, the wrapper discovers it automatically, including
`%USERPROFILE%\.gemini\bin\agy.exe`, and opens its own mini chat. An authenticated
Antigravity installation reuses its existing credential cache; bootstrap skips the
old Gemini Google-login flow. Use `@latest` to avoid launching an older cached release.

Google ended personal Gemini CLI service for free individual users and Google AI
Pro/Ultra users on June 18, 2026. Personal users should use Antigravity CLI instead.
Gemini CLI remains available with eligible organization licenses or paid API keys.
See [Google's transition announcement](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/).

If Antigravity is missing on Windows, bootstrap downloads and runs Google's
[official installer](https://antigravity.google/docs/cli/install/). It passes
`--skip-aliases` and `--skip-path` to preserve shell aliases and PATH settings.
The binary is installed in `%LOCALAPPDATA%\agy\bin`, then discovered directly.
First-time users complete Antigravity sign-in in the same terminal and enter
`/quit` to open the mini chat. Other platforms should install `agy` using the
official platform-specific instructions.
A cached `.gemini/oauth_creds.json` does not restore discontinued personal Gemini
CLI access. Antigravity manages its own credentials; this wrapper does not copy
tokens from Gemini credentials into its system keyring.

If `GEMINI_API_KEY` is set, bootstrap opens API chat directly; this mode has no tools.
Native providers retain their own authentication, workspace trust, and tool approvals.
An expired or unauthenticated Antigravity installation may still require its own login.

## Optional setup from a source checkout

Open CMD in the repository folder:

```cmd
setup.cmd
gmini.cmd native
```

`native` uses the discovered Antigravity CLI when available. Its existing authenticated
session is reused; complete provider-specific login or trust prompts only if needed.
Then start the mini chat:

```cmd
gmini.cmd
```

Run `gmini.cmd doctor` to inspect discovered providers. Set `GMINI_AGY_PATH` to an
Antigravity executable to select a specific installation. `setup.cmd --install-cli`
installs the legacy `@google/gemini-cli@0.63.0` locally under `data/runtime`, without
global changes; use it only with supported organization or paid API access.
Set `GMINI_CLI_PATH` to a JavaScript entrypoint for a specific legacy Gemini CLI.

To use the local command from another folder in the same CMD window, first run
this while in the repository folder:

```cmd
set "PATH=%CD%;%PATH%"
gmini help
```

For a persistent command, optionally run `npm.cmd link` from the repository folder.
This installs a command into your npm prefix. The local `.cmd` launchers do not
require `npm link` and do not depend on PowerShell ExecutionPolicy.

## Mini chat

All wrapper prompts, status messages and errors are in English. `/model` (also
`/ model`) shows available Antigravity models and prompts for an ID. Use
`/model ID` to switch immediately or `/model default` to reset. Selection persists.

Bootstrap installs native skills globally in `~/.gemini/skills` for Gemini and
`~/.gemini/antigravity-cli/skills` for Antigravity. `setup --global` performs the
same native installation explicitly. Conflicting user skills are not overwritten.

For an npm installation, use `npx --yes --package=do-it-gemini@latest gmini` followed
by the desired subcommand. In a source checkout, use the local launcher:

```cmd
gmini.cmd chat --session work
gmini.cmd chat --provider agy
gmini.cmd ask "Explain the purpose of this project" --skill analyze
gmini.cmd skills
gmini.cmd plugins
gmini.cmd plugins disable research
gmini.cmd sessions
```

Commands inside the chat:

| Command | Action |
|---|---|
| `/skills` | List enabled skills |
| `/skill analyze` | Select a skill for subsequent messages |
| `/skill auto` | Restore task-based skill selection |
| `$plan task description` | Explicitly select a skill in a message |
| `/plugins` | Show enabled packs |
| `/sessions` | List saved sessions |
| `/session work` | Continue a session |
| `/new` | Create a separate session |
| `/history` | Show conversation history |
| `/model model-name` | Change the model and save the selection |
| `/exit` | Exit |

With `--provider auto`, the mini chat prefers discovered Antigravity CLI, then legacy
Gemini CLI, then API access. `--provider agy` explicitly selects Antigravity.
The Antigravity integration passes instructions and history through streamJSON on
stdin, waits for the completed result, and saves the reply. Legacy CLI mode uses
a headless JSON request. Native trust and tool approval rules still apply;
headless mode may reject some operations. For interactive work, use `gmini native`.
The wrapper launches providers without a shell and hides child Windows console
windows; interactive native mode inherits the current console. It does not spawn
separate CMD windows for requests.
Every request includes the full conversation history. Long sessions increase
usage and may exceed the model's context limit; use `/new` for a separate task.

Alternatively, use API mode without installing the CLI:

```cmd
set "GEMINI_API_KEY=your-key"
gmini.cmd chat --provider api --model gemini-3.8-flash
```

API mode is a conversation with skill instructions, **without filesystem, shell,
or browser access**. The key is read from the environment and is not saved in
configuration. Requests send the selected instructions and history to Google and
are subject to your account's usage limits and billing. Change the model with
`--model` as needed.

## Data locations

With npm/npx on Windows, persistent wrapper data is stored in
`%LOCALAPPDATA%\do-it-gemini\data`. The default workspace is its sibling directory,
`%LOCALAPPDATA%\do-it-gemini\workspace`. Neither depends on the current CMD folder
or the temporary npm cache. A source checkout defaults to its own `data/` folder.

```text
data/
  config.json           enabled packs, model, and workspace
  sessions/*.json       completed message pairs with timestamps
  runtime/              local official CLI installation
  workflows/            artifacts created by workflow skills
skills/*/SKILL.md        Gemini-native skill instructions
plugins/*/plugin.json   pack membership and guidance
.gemini/skills/         skills installed in the workspace by setup
.agents/skills/         workspace skills copied for Antigravity
.gemini/commands/gmini/ /gmini:<skill-name> commands
```

Override the data directory with `--data D:\GeminiData` or `GMINI_DATA_DIR`.
Native providers manage their credentials and additional native sessions according
to their own rules; the wrapper does not relocate or copy them. Antigravity uses
its own credential storage, including the system keyring where configured.
Wrapper history is saved only after a successful response. Corrupt JSON produces
an explicit error instead of silently discarding history.

## Use your own project

For a source checkout:

```cmd
gmini.cmd setup --workspace "D:\Projects\my-app"
gmini.cmd native --workspace "D:\Projects\my-app"
```

For the npm entrypoint, pass `--workspace "D:\Projects\my-app"` to the one-command
launch. Setup imports the pack context into `GEMINI.md` while preserving existing
text, and copies skills with their `references/`, `scripts/`, and `assets/` into
both `.gemini/skills` for Gemini and `.agents/skills` for Antigravity. It checks all
conflicts first and refuses to overwrite modified context, skills, or commands.
Repeating setup with identical files is supported.

`plugins enable/disable` controls the wrapper's mini chat. Already installed native
skills remain in the workspace and can be managed with the appropriate native CLI.
Disabling a pack does not delete files from your project.

The package also uses the standard Gemini extension format:

```cmd
gemini extensions install "C:\Projects\do-it-gemini"
```

Replace the path with your local checkout. This alternative registers the entire
extension in the official CLI. Avoid combining extension installation and workspace
setup in the same project, which can duplicate skills and commands.

## Create a plugin

Add `skills/my-skill/SKILL.md` with YAML `name` and `description` fields.
Then create `plugins/my-pack/plugin.json`:

```json
{
  "name": "my-pack",
  "version": "1.0.0",
  "description": "My project workflows",
  "skills": ["my-skill"],
  "instructions": "Use only for tasks within my project."
}
```

Enable it with `gmini plugins enable my-pack`. These plugins are declarative
instruction packs; they do not execute arbitrary JavaScript. Configure MCP servers
separately using the official Gemini format. Copying instructions does not provide
access to Codex services or account-linked connectors.

## Validation and sources

```cmd
npm.cmd test
npm.cmd run check
```

The test suite covers history, HTTP contracts, errors, plugins, and subprocess
launching without calling a paid API. `check` validates the catalog and JavaScript
syntax. The wrapper itself uses no third-party runtime libraries.

The skills use Gemini's native format. OMX procedures are adapted from
oh-my-codex 0.21.9 (MIT, Yeachan-Heo); other sources appear in the provenance catalog.
Subagents and independent reviews are used only when the installed Gemini surface
actually supports them. Skills do not simulate an unavailable runtime.

Official adaptation references:

- [Skills](https://geminicli.com/docs/cli/skills/) and [creating skills](https://geminicli.com/docs/cli/creating-skills/).
- [Extensions](https://geminicli.com/docs/extensions/reference/) and [custom commands](https://geminicli.com/docs/cli/custom-commands/).
- [Headless CLI](https://geminicli.com/docs/cli/headless/) and [authentication](https://geminicli.com/docs/get-started/authentication/).
- [Gemini generateContent](https://ai.google.dev/api/generate-content) and [Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash).

Skill provenance is recorded in `skills/catalog.json`. Account-linked services
such as Sites, Pets, and the Supabase connector are not automatically transferred.
