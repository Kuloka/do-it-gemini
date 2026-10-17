# Antigravity App usage panel

A native side-panel plugin with two readings: context occupancy and remaining model
quota. It does not add model selectors, chat commands or task dashboards.

## Install

Requires Node.js 20+ and Antigravity **App** with UI extensions. Tested in App 2.24.0
on Windows. This plugin targets the graphical App, not the standalone IDE or CLI.

```cmd
npx -y do-it-gemini@latest app install
```

In the App, open **Overview > Plugins > Usage**. If disabled, enable the plugin and
its Usage panel in Customizations. If it is missing, restart the App. Installation
does not overwrite other App settings or enable unrelated plugins.

To update, run the same command and restart the Usage sidecar from its settings.
User-modified plugin files stop an update before replacement. To stop the panel,
disable Usage in Customizations; the App manages its process lifecycle.

## What the readings mean

- **Context:** latest model invocation input, cache-read and output tokens divided
  by the App-reported context capacity. It is a snapshot, not a live count of text
  currently being typed. An explicit App estimate is prefixed with `≈` when actual
  usage is not available. No capacity is hardcoded.
- **Limit remaining:** native remaining quota for the model used in that invocation.
  It is not the same as context space or an aggregate of every model's quota. After
  switching models, it follows the next invocation. Quota is refreshed at most once
  per minute while the panel is visible.

Missing or unsupported data displays `—`, never a fabricated percentage. A fresh
conversation may have no readings until its first model invocation. Visible panels
poll every ten seconds; hidden panels pause frontend polling. No model requests
are generated to collect metrics.

## Integration and data boundaries

The native plugin installs under `~/.gemini/config/plugins/do-it-gemini-usage/`.
Its sidecar binds to loopback, authenticates metric requests with the host-provided
UI token, and uses the local language server address and CSRF token supplied to
sidecars. It does not search for OAuth credentials, patch App files, or send
telemetry. Failures write a fixed diagnostic, operation name and optional HTTP
status to the sidecar log at most once per minute, without raw error text or data.
Only three fields reach the panel: context percentage, whether it is an
estimate, and remaining quota percentage.

The adapter uses App 2.24.0's local `GetCascadeTrajectoryGeneratorMetadata` and
`GetUserStatus` contracts. These are internal, unversioned read APIs; a later App
release can change them. Generator requests set `includeMessages: false`, but the
App may still return prompt metadata. The adapter immediately reduces it to
numbers and model identity; it does not persist or log raw responses. At most
sixteen sanitized conversation snapshots and a sanitized quota map are held in
memory. No chat messages, settings or account details are returned to the UI.

Sources and integration evidence:

- [Official plugin discovery](https://www.antigravity.google/docs/plugins/).
- [Official sidecar lifecycle](https://www.antigravity.google/docs/sidecars/).
- [App UI extension release](https://www.antigravity.google/docs/changelog?tab=hub).
- [Firsthand UI extension guide](https://danicat.dev/posts/building-sidecars-and-ui-extensions-in-antigravity/).
- Installed App 2.24.0 built-in `ui-plugin-navigation` instructions, `sidecar_sdk`
  bridge and frontend protobuf descriptors were inspected to verify this adapter.

Validation includes authenticated HTTP routes, read-only endpoint boundaries,
token calculations, quota matching, streaming refresh, native installation and
actual rendering inside the App. This is not a guarantee of compatibility with
future App versions.
