# Dependency updates and vulnerability scans

Dependabot checks npm packages, the Docker base image, and GitHub Actions every
Monday at 06:00 Europe/Prague. Minor and patch npm and Actions updates are
grouped; major updates stay separate. Review and merge passing update PRs each
week instead of enabling automatic merges. The Node image is digest-pinned so
base-image rebuilds arrive as explicit, reviewable changes.

The `Dependency security` workflow runs for relevant pull requests and pushes,
every Tuesday, and on demand. It:

- fails on high or critical npm advisories in `package-lock.json`;
- builds the production `Dockerfile` and fails on fixable high or critical OS
  or library vulnerabilities in the resulting image.

When a scan fails, prefer the smallest fixed dependency or base-image update,
run the normal quality gate, and record why if an advisory cannot be fixed.
Suppressions must be narrow, advisory-specific, documented, and time-bounded.
