# Client setup

## Requirements

- Node.js 20 or newer
- An Atlas Cloud account with available credits
- An API key from `https://www.atlascloud.ai/console/api-keys`

Do not paste the key into an AI chat. Enter it only into a terminal prompt opened on the client's machine.

## Recommended setup

From the installed skill directory, run:

```sh
node scripts/configure-key.mjs
```

The script hides terminal input, validates only the key's basic shape, and writes it outside the skill folder:

- macOS/Linux: `~/.config/atlas-cloud-media/credentials.json`
- Windows: `%APPDATA%\atlas-cloud-media\credentials.json`

On POSIX systems, the directory is created with mode `0700` and the file with mode `0600`. The script never prints the key.

## Environment-variable alternative

Set `ATLASCLOUD_API_KEY` in the process that runs the skill. It overrides the saved credential.

macOS/Linux for the current terminal:

```sh
export ATLASCLOUD_API_KEY="PASTE_KEY_HERE"
```

PowerShell for the current terminal:

```powershell
$env:ATLASCLOUD_API_KEY = "PASTE_KEY_HERE"
```

Avoid placing secrets in a project `.env` file unless that file is excluded from version control. Never commit a credential file.

## Verification

The public model catalog needs no key:

```sh
node scripts/atlas-media.mjs models --type image --search "gpt image"
```

Do not make a billable generation merely to test the key. The first real request should follow a dry run and explicit cost confirmation.
