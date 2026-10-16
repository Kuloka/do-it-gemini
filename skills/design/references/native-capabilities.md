# Gemini and Antigravity design capabilities

Verified against official docs on 2026-10-16. Use the installed help and actual tool
declarations when they differ; tool availability is not established by a brand name.

## Skill discovery

| Host | Project skills | Canonical user skills |
|---|---|---|
| Gemini CLI | `.gemini/skills`, `.agents/skills` | `~/.gemini/skills` (also shared `.agents/skills`) |
| Antigravity CLI | `.agents/skills` | `~/.gemini/antigravity-cli/skills` |
| Antigravity App/IDE | `.agents/skills` | `~/.gemini/config/skills` |

Each skill is a folder with `SKILL.md` and YAML `name`/`description`. Copy the full
bundle, not just its entry file. Relative references resolve from that bundle.
Gemini semantic discovery uses `activate_skill` with the host's consent lifecycle;
`/skills list` and `/skills reload` inspect/refresh its discovery. Antigravity can
activate skills semantically or through native `/<skill-name>` invocation. IDE
Customizations is a separate inspection surface. Trust and workspace overrides
still apply. Pack mini-chat `/skill NAME` is its own wrapper selection mechanism.

## Browser and visual checks

**Antigravity CLI/App:** the documented `/browser` workflow activates a hidden
browser subagent when the user invokes it. Ordinary skill activation does not
magically expose that agent. Do not invent an invocation or claim screenshots from
a browser that was never connected. When its tools are genuinely available, Chrome
DevTools supports interaction, screenshots, viewport emulation, console/network
inspection and audits. Respect remote debugging and page-evaluation consent.

**Antigravity IDE:** its browser integration is separate from CLI/App `/browser`.
Inspect the exposed tools and settings. Do not send an IDE session to a CLI-only
subagent or promise that a disabled browser will work automatically.

**Gemini CLI:** current docs describe a bundled `browser_agent`, disabled by
default and requiring Chrome 144+. Its configuration includes
`agents.overrides.browser_agent.enabled`. Optional screenshot/coordinate tools
via `agents.browser.visualModel` require API-key or Vertex authentication rather
than Google sign-in. Do not silently change the user's configuration/auth mode to
obtain them. Use an already configured browser or report the missing capability.

An existing repository browser test runner or local Chromium can be another real
verification route when available and authorized. A script that merely produces
HTML is not a visual check. Do not install a browser/test framework by default.

## Images and implementation

Antigravity documents `generate_image` (`Prompt`, `ImageName`, optional
`ImagePaths`). Use it only if exposed, give it an actual visual brief and inspect
the returned file. Gemini MCP can provide image capabilities, but that does not
establish a universal built-in image generator. Prefer editing existing vector/
CSS assets when they are the appropriate medium. Keep assets local and references
real; generated imagery does not establish product facts or endorsements.

Use the actual host's file, search, terminal and delegation tools. Never invent
Codex goal functions, OMX state APIs or tmux ownership. Headless wrapper sessions
inherit the underlying provider's permission limits. API-only pack chat has no
browser/filesystem tools and should provide code/specifications with execution
limits stated, not claim to build or screenshot a project.

## Sources

- [Gemini skill creation](https://geminicli.com/docs/cli/creating-skills/)
- [Gemini skills best practices](https://geminicli.com/docs/cli/skills-best-practices/)
- [Gemini browser/subagents](https://geminicli.com/docs/core/subagents/)
- [Antigravity surface-specific skills](https://www.antigravity.google/docs/skills/)
- [Antigravity CLI/App browser](https://www.antigravity.google/docs/commands/browser/)
- [Antigravity IDE browser](https://www.antigravity.google/docs/browser)
- [Antigravity image tool catalog](https://www.antigravity.google/docs/hooks/)
