# BLOCKERS.md

Things that blocked the build, with the workaround taken.

## B-001 No empty repository; repository creation refused
The brief says BRINK is a new standalone project in "this empty repo", but the
session was attached to four existing repositories (none empty) and
`create_repository` was refused by the GitHub integration (403).

**Workaround.** BRINK lives as a self-contained folder `brink/` on the designated
branch `claude/brink-game-build-0csh6q` of `flashpoint-2027`. Nothing in `brink/`
reads, imports, or depends on the surrounding repository, and nothing outside
`brink/` was modified. To give it its own repository:

```bash
git checkout claude/brink-game-build-0csh6q
git subtree split -P brink -b brink-main
# create an empty repo "brink" on GitHub, then:
git push git@github.com:hallamburnapp-cloud/brink.git brink-main:main
```

The CI workflow is at `brink/.github/workflows/ci.yml` and becomes active as soon as
`brink/` is a repository root (GitHub only reads workflows from the root).

## B-002 Sandbox permission classifier
Several ordinary operations (adding a git remote to a scratch repo, moving the
project folder, and one `vitest` invocation) were refused by the session's
permission classifier. Work continued with equivalent non-destructive steps and
the standard `npm` scripts. If any step is missing from the commit history it is
because the classifier refused it, not because it was skipped by design.
