---
name: gh-create-pr
description: Create high-quality GitHub pull requests for code changes using the GitHub CLI. Use when Codex needs to open a PR, prepare PR metadata, create a meaningful branch for changes, publish local branch changes to GitHub, or clean up the PR branch after merge, especially when the PR should include project assignment when available, a context-appropriate milestone when available, labels, and assignee brugabi.
---

# GitHub PR Creator

## Goal

Create PRs that are easy to review, correctly targeted, and fully decorated with available repository metadata. Prefer `gh` commands and GitHub API calls over manual browser steps.

## Required Workflow

1. Inspect local state:

```bash
git status --short
git branch --show-current
git remote -v
git log --oneline --decorate -5
```

2. Create or choose a meaningful branch before opening the PR.

- If the current branch is the base branch, create a new branch.
- If the current branch name is generic, stale, or unrelated to the changes, create a better branch and move the work there.
- Use concise kebab-case that reflects the diff, such as `fix-login-validation`, `add-user-match-history`, or `refactor-auth-service`.
- Prefer repository conventions. Common prefixes are `fix/`, `feat/`, `docs/`, `refactor/`, `test/`, and `chore/`.
- Include an issue number only when clearly tied to the work, for example `fix/123-login-validation`.

```bash
git switch -c <meaningful-branch-name>
```

3. Identify the GitHub repository and base branch:

```bash
gh repo view --json owner,name,defaultBranchRef --jq '{owner:.owner.login,name:.name,defaultBranch:.defaultBranchRef.name}'
```

Use the repo default branch as the base unless the branch, issue, or user request points elsewhere.

4. Compare the branch against the base:

```bash
git fetch origin
git diff --stat origin/<base>...HEAD
git log --oneline origin/<base>..HEAD
```

5. Push the meaningful branch:

```bash
git push -u origin <meaningful-branch-name>
```

6. Discover available metadata before creating the PR:

```bash
gh label list --limit 100
gh api repos/{owner}/{repo}/milestones --jq '.[] | {number,title,state,due_on,description}'
gh project list --owner {owner} --format json
```

Treat missing projects, disabled milestones, absent labels, insufficient permissions, or unavailable `gh project` support as optional metadata gaps. Continue creating the PR and report the gap.

7. Create the PR with a reviewable title and body:

```bash
gh pr create --base <base> --head <meaningful-branch-name> --title "<title>" --body-file <body-file>
```

Write multi-line PR bodies to a temporary file instead of relying on shell quoting.

8. Add metadata after creation:

```bash
gh pr edit <pr-url-or-number> --add-assignee brugabi
gh pr edit <pr-url-or-number> --add-label "<label>"
gh pr edit <pr-url-or-number> --milestone "<milestone>"
gh project item-add <project-number> --owner <owner> --url <pr-url>
```

9. Clean up the created branch only when safe.

- Do not delete the PR source branch immediately after opening the PR; an open PR normally depends on that branch.
- After the PR is merged or closed, delete the created branch if it is no longer needed and no open PR references it.
- Prefer GitHub's PR-aware cleanup when available:

```bash
gh pr view <pr> --json state,merged,headRefName,headRepositoryOwner
gh pr merge <pr> --delete-branch
```

- If the PR was already merged and branch cleanup is still needed:

```bash
git push origin --delete <meaningful-branch-name>
git branch -d <meaningful-branch-name>
```

## Metadata Selection

Assignee:

- Always assign `brugabi`.

Labels:

- Use existing labels only unless the user asks to create labels.
- Pick labels that match the change type and repository conventions, such as `bug`, `fix`, `feature`, `enhancement`, `documentation`, `dependencies`, `refactor`, `test`, or area labels.
- If no relevant existing labels exist, skip labels and state that none matched.

Milestone:

- Use an open milestone only.
- Prefer a milestone mentioned by the issue, branch name, PR context, or project conventions.
- If there is no explicit context, choose the nearest relevant open milestone by due date or release naming.
- If all milestones are closed, unrelated, or absent, skip the milestone.

Project:

- Add the PR to the most relevant existing project when one clearly matches the repository, product area, sprint, roadmap, or issue context.
- Do not create projects.
- If several projects are plausible and none is clearly better, skip project assignment and mention the ambiguity.

## PR Body

Use this concise structure:

```markdown
## Summary
- ...

## Tests
- ...

## Notes
- ...
```

Include `Notes` only for useful context, limitations, skipped metadata, migrations, screenshots, or follow-up work. Mention tests exactly as run. If tests were not run, say so with the reason.

## Final Response

After creating the PR, report:

- PR URL
- Base and head branch
- Labels, milestone, project, and assignee applied
- Tests run
- Any metadata skipped or failed, with the reason
- Branch cleanup status, when cleanup was requested or applicable
