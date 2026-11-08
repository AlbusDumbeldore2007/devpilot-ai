# GitHub Setup and Push Guide

This guide explains how to publish the DevPilot AI repository to GitHub. It assumes the project is at the repository root (`devpilot-ai/`) and that Git is installed.

---

## 1. Prerequisites

- A GitHub account. This project is configured for the account **AlbusDumbeldore2007**.
- Git 2.28 or later.
- Optional: the GitHub CLI (`gh`) for creating the remote repository from the terminal.

Check the tools:

```bash
git --version
gh --version
```

If `gh` is not installed, install it from <https://cli.github.com/> or create the repository in the GitHub web UI and use the manual remote steps in section 5.

---

## 2. Configure Git identity

Use the same email that is associated with the GitHub account (or a GitHub noreply address):

```bash
git config --global user.name "AlbusDumbeldore2007"
git config --global user.email "your-email@example.com"
```

To keep the identity local to this repository instead of global:

```bash
cd devpilot-ai
git config user.name "AlbusDumbeldore2007"
git config user.email "your-email@example.com"
```

Verify:

```bash
git config --get user.name
git config --get user.email
```

---

## 3. Pre-push checklist

Run these checks from the repository root. Do not push until they pass.

### 3.1 Confirm the working tree

```bash
git status
```

Expected: all intended changes are staged/committed and the tree is clean.

### 3.2 Confirm secrets are ignored

```bash
git check-ignore -v server/.env
```

Expected: `.gitignore` reports that `server/.env` is ignored.

Never commit real credentials. The repository must contain only `.env.example`. If an `.env` file was ever committed, rotate the keys before pushing and remove the file from history.

### 3.3 Confirm no dependencies or build output are tracked

```bash
git ls-files | grep -E 'node_modules|client/dist|server/.env'
```

Expected: no output. If files appear, remove them from the index:

```bash
git rm -r --cached node_modules server/node_modules client/node_modules client/dist
git rm --cached server/.env
```

Then commit the cleanup.

### 3.4 Confirm the required documentation exists

```bash
ls PRD.md HLD.md LLD.md README.md GITHUB_SETUP.md
```

All five files must be in the repository root.

### 3.5 Run a final local check

```bash
npm run install:all
npm run build
```

Optionally start the API and confirm health:

```bash
npm run dev:server
curl http://localhost:5000/api/health
```

---

## 4. Authenticate the GitHub CLI

```bash
gh auth login
```

Choose:

- **GitHub.com**
- **HTTPS**
- Authenticate with a browser or a personal access token.
- Confirm the active account:

```bash
gh auth status
```

The output should mention `AlbusDumbeldore2007`. If another account is active, switch:

```bash
gh auth switch
```

---

## 5. Create the remote repository and push

### Option A — create and push with GitHub CLI (recommended)

From the repository root:

```bash
cd devpilot-ai

gh repo create devpilot-ai \
  --private \
  --source=. \
  --remote=origin \
  --description "DevPilot AI — AI-powered developer task and project manager" \
  --push
```

- Use `--public` instead of `--private` if the assessment requires a public repository.
- `--source=.` uses the current local repository.
- `--remote=origin` adds the remote.
- `--push` pushes the current branch and sets tracking.

If the repository name `devpilot-ai` is already taken under the account, choose another name:

```bash
gh repo create devpilot-ai-workspace --private --source=. --remote=origin --push
```

### Option B — create the repository in the GitHub UI

1. Open <https://github.com/new>.
2. Owner: **AlbusDumbeldore2007**.
3. Repository name: `devpilot-ai`.
4. Visibility: private or public as required.
5. Do **not** initialise with a README, `.gitignore` or license; the local repository already has history.
6. Create the repository.

Then connect and push:

```bash
cd devpilot-ai
git remote add origin https://github.com/AlbusDumbeldore2007/devpilot-ai.git
git branch -M master
git push -u origin master
```

If the default branch is expected to be `main`:

```bash
git branch -M main
git push -u origin main
```

Pick one branch name and use it consistently. The current local branch is `master`.

### Option C — SSH remote

If SSH keys are configured:

```bash
git remote add origin git@github.com:AlbusDumbeldore2007/devpilot-ai.git
git push -u origin master
```

Test SSH access first:

```bash
ssh -T git@github.com
```

---

## 6. Verify the push

```bash
git remote -v
git branch -vv
git status
git log --oneline -5
```

Expected:

- `origin` points to `github.com/AlbusDumbeldore2007/devpilot-ai`.
- The current branch tracks `origin/<branch>`.
- `git status` reports a clean tree.
- The log shows the project commits.

Open the repository in a browser:

```text
https://github.com/AlbusDumbeldore2007/devpilot-ai
```

Confirm that `PRD.md`, `HLD.md`, `LLD.md`, `README.md`, `GITHUB_SETUP.md`, `client/` and `server/` are visible, and that `server/.env`, `node_modules/` and `client/dist/` are absent.

---

## 7. Add the documentation commit (if not already committed)

If the documentation files were created after the last commit:

```bash
cd devpilot-ai
git add PRD.md HLD.md LLD.md GITHUB_SETUP.md README.md
git commit -m "docs: add PRD, HLD, LLD and GitHub setup guide"
git push
```

If the remote is not configured yet, complete section 5 first.

---

## 8. Optional repository settings

### 8.1 Description and topics

```bash
gh repo edit AlbusDumbeldore2007/devpilot-ai \
  --description "AI-powered developer task and project manager (MERN + LLM)" \
  --add-topic mern,react,express,mongodb,ai,llm,project-management
```

### 8.2 Default branch

If you renamed the branch to `main`:

```bash
gh repo edit AlbusDumbeldore2007/devpilot-ai --default-branch main
```

### 8.3 Collaborators

Only needed if an assessor must access a private repository:

```bash
gh api \
  --method PUT \
  repos/AlbusDumbeldore2007/devpilot-ai/collaborators/<github-username> \
  -f permission=read
```

---

## 9. Troubleshooting

### `remote origin already exists`

```bash
git remote set-url origin https://github.com/AlbusDumbeldore2007/devpilot-ai.git
```

Or remove and re-add:

```bash
git remote remove origin
git remote add origin https://github.com/AlbusDumbeldore2007/devpilot-ai.git
```

### `Updates were rejected because the remote contains work you do not have`

The remote repository was initialised with a README or another commit. Either merge the remote history or force-push only if you are certain the remote has no work you need:

```bash
git pull --rebase origin master
git push -u origin master
```

Do not use `--force` on a shared repository without explicit approval.

### Authentication failed

- Re-run `gh auth login`.
- For HTTPS, use a personal access token instead of a password.
- For SSH, confirm the key is added to GitHub:

```bash
ssh -T git@github.com
```

### `src refspec master does not match any`

The current branch may be named `main`, or there may be no commits yet:

```bash
git branch --show-current
git log --oneline
```

Commit your work, then push the actual branch name.

### Accidentally committed `server/.env`

1. Rotate every secret in the file (MongoDB and AI keys).
2. Remove the file from tracking:

```bash
git rm --cached server/.env
git commit -m "chore: stop tracking environment file"
```

3. If the secret was pushed, remove it from history with a history-rewriting tool and force-push after coordinating with collaborators.

### Large file rejected

The repository should not contain `node_modules/` or build output. Check staged files:

```bash
git ls-files -s | sort -k3 -n | tail -20
```

If a database dump or archive was committed, remove it from the index and add it to `.gitignore`.

---

## 10. Branches used by this project

The local history contains feature work merged into `master`:

```text
master
feature/backend-api
feature/react-workspace
docs/readme
```

Pushing all branches:

```bash
git push origin --all
```

Pushing tags (if any):

```bash
git push origin --tags
```

For the assessment, pushing the default branch plus feature branches is sufficient to demonstrate the Git workflow. A typical commit message convention used here is:

```text
feat:     new functionality
fix:      bug fix
docs:     documentation
refactor: internal restructuring
style:    formatting or UI styling
chore:    tooling/configuration
```

---

## 11. One-command summary

```bash
cd devpilot-ai
git status
git add .
git commit -m "docs: add PRD, HLD, LLD and GitHub setup guide"
gh repo create devpilot-ai --private --source=. --remote=origin --push
git push origin --all
```

Replace `--private` with `--public` if required. Confirm the remote and branch tracking afterwards with `git remote -v` and `git branch -vv`.
