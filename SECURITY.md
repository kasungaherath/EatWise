# Keeping EatWise credentials private

API keys, database passwords, and the session signing secret belong in Railway
service variables or an ignored local `server/.env`. The committed
`server/.env.example` has empty credential fields and non-secret local defaults.

Never put credentials in a `VITE_` variable: those values are bundled into the
browser application. Public source code, catalogue data, icons, and images do
not need to be hidden. User records and database exports must stay out of Git.

## Checks before a commit

Install [Gitleaks](https://github.com/gitleaks/gitleaks/releases), then enable the
repository's local check once per checkout. On Windows, the included installer
downloads version 8.30.1 and verifies its pinned SHA-256 checksum:

```powershell
./scripts/install-secret-scanner.ps1
```

The Windows hook can use this ignored `.tools/gitleaks` installation. On other
systems, install Gitleaks on your PATH. Enable the hook with:

```sh
git config core.hooksPath .githooks
```

The pre-commit check scans staged changes and stops the commit if a credential
is detected or Gitleaks is unavailable. The pre-push check scans all local history
before uploading it. Both checks redact any detected values, and inline comments
cannot suppress detections. To scan all existing history manually on Windows:

```powershell
./.tools/gitleaks/gitleaks.exe git --redact=100 --no-banner --ignore-gitleaks-allow --max-decode-depth=2 --log-opts="--all --full-history --no-textconv" .
```

On other systems, use `gitleaks` from your PATH with the same arguments.

The **Secret scan** GitHub workflow scans pushes, pull requests, and the complete
history every week. It uses a pinned checkout action, a checksum-verified scanner,
read-only repository permissions, and no app secrets. Workflow failures are
reported after a push; they do not themselves block that push. GitHub's repository
secret protection and push protection are enabled to reject supported secrets
before they are published. Require the scan check in branch rules when reviewing
pull requests.

## If a credential is exposed

Revoke or rotate it at its issuing service immediately, update Railway privately,
and check provider activity for misuse. Removing a file or rewriting Git history
cannot invalidate copies someone already downloaded. Never paste the exposed
value into an issue, commit message, screenshot, or scan report.

Secret scanning reduces credential leaks; it is not a complete application
security audit. Keep dependencies updated and separately review authentication,
access controls, request throttling, and deployment settings.
