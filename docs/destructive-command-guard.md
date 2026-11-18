# Destructive-command guard

Buddy bundles a shell guard that stops a short list of commands that are hard or impossible to undo before they run.

## Guarded commands

- Terraform and OpenTofu changes, and Kubernetes and Helm deletions.
- Deletions on AWS, Google Cloud, and Azure.
- Destructive SQL, database drops, and database resets such as `prisma migrate reset` or `rails db:drop`.
- Forced or deleting Git pushes, `git reset --hard`, `git clean -f`, and other Git commands that discard history.
- GitHub repository, release, and API deletions, and package publishing.
- Docker volume deletion, disk erasing and formatting, and `crontab -r`.
- Recursive removal of a root, home, current, or parent directory, such as `rm -rf ~`.

## What happens

What happens next depends on your coding tool:

- **Claude Code and Cursor** ask you to approve the command. If you approve, it runs. If you decline, or nobody can approve it, such as in a headless run, the agent stops and gives you the exact command to review and run yourself. If you let your tool approve commands automatically, for example with Cursor's auto-run, it also approves these.
- **Codex** cannot ask from a hook yet, so the guard blocks the command, and the agent gives you the exact command to run yourself.

All other commands run normally, including heredocs, file removal inside your project, and commands the guard cannot read.

## Limits

The guard prevents accidents. It is not a sandbox: it does not check scripts or programs that a command starts. To limit what agents can change, use your coding tool's sandbox and permission settings.

The guard runs on macOS 10.15 or newer and needs `zsh` and `jq`. If `jq` is missing, the guard blocks shell commands until you install it.

## Check the guard

To check that the guard is active, ask the agent to run `terraform apply -help`. Buddy should ask for approval, or block it in Codex, before Terraform starts. In Codex, the guard runs only after you review and trust Buddy's hook. In Cursor Cloud Agents, the guard might not run, because Cursor does not yet document plugin hooks as available there.

For the hook design per tool, see [Harness compatibility](harness-compatibility.md#destructive-command-guard).
