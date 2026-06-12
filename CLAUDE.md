# CLAUDE.md

Follow all guidelines, conventions, and instructions defined in [AGENTS.md](./AGENTS.md). That file is the single source of truth for this project.

## Commit authorship

Never add yourself (Claude) as co-author in commits. Do not append `Co-Authored-By` trailers of any kind.

## Branch protection

Never commit directly to `main`. Always create a feature branch first, regardless of whether the change is code, docs, or config. See the "Branch protection rule" section in AGENTS.md for recovery steps if main is accidentally modified.

## Pull requests

Never open a pull request automatically. Create the branch and push the commit, then stop. Only open a PR when the user explicitly asks (e.g. "open a PR", "create a PR", or invokes `/gh-create-pr`). Small changes are often accumulated into a single PR by the user.
