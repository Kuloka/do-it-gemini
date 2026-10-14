# Publish the CMD launch command

The package is distributed through npm. npm requires two-factor authentication
for public publication, but users do not need an npm account or 2FA to install it.
The registry command below becomes available after a successful public publish.

## Publish as the package owner

In a browser, sign in to the npm account that will own the package and complete
two-factor authentication setup. Keep the browser login and authenticator available
for the authentication or approval prompts required by npm.

From CMD in the repository folder, authenticate and publish:

```cmd
npm.cmd login
npm.cmd publish --access public
```

Complete the browser and two-factor prompts presented by npm. Do not paste npm
tokens, passwords, or recovery codes into source files or chat. If the package name
is already owned by someone else, change `name` in `package.json` and update the
launch commands accordingly. Before another release, choose an unpublished version.

Run `npm.cmd test` and `npm.cmd run check` before publishing. Confirm npm reports
successful publication before describing the package as publicly available.

## Launch after publication

With Node.js 20 or newer installed, run this from any interactive CMD window:

```cmd
npx -y do-it-gemini@latest
```

It downloads the latest package, prepares a persistent workspace, and opens the
wrapper's mini chat. Git and a manual repository download are unnecessary.
Version 0.1.1 discovers existing Antigravity CLI (`agy`) installations, including
`%USERPROFILE%\.gemini\bin\agy.exe`, and reuses their existing authentication.
If needed, Windows bootstrap runs Google's official Antigravity installer without
changing shell aliases or PATH. First-time users sign in and enter `/quit`.
With an authenticated Antigravity installation, there is no additional old Gemini
Google-login window. If `GEMINI_API_KEY` is set, bootstrap opens API chat instead,
without filesystem, shell, or browser tools.

Personal Gemini CLI access ended on June 18, 2026; use Antigravity for personal
access. Legacy Gemini CLI requires eligible organization access or paid API keys.
See [Google's transition announcement](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/)
and [Antigravity CLI documentation](https://antigravity.google/docs/cli/install/).
Gemini's cached OAuth file does not restore discontinued access and is not copied
into Antigravity credential storage. An existing Antigravity login is reused when valid.

Persistent wrapper data is stored in `%LOCALAPPDATA%\do-it-gemini\data`, outside
the temporary npx cache. The default workspace is
`%LOCALAPPDATA%\do-it-gemini\workspace`, so the command can be launched from a
folder where you cannot write files. Native providers keep their own credentials
and native sessions separately; the wrapper does not relocate them.

To work in an existing project, add `--workspace "D:\Projects\my-app"`.
To open the mini chat explicitly after authentication:

```cmd
npx --yes --package=do-it-gemini@latest gmini chat
```

## Test a local package before publication

Create a package archive in the repository folder:

```cmd
npm.cmd pack
```

Use the actual generated filename and its absolute path:

```cmd
npx --yes --package="C:\Packages\do-it-gemini-0.1.1.tgz" gmini bootstrap
```

The `.tgz` file is available only on a machine that can access that path. This
checks package installation and launch; it does not create a public download URL.
