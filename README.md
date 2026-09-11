<!-- Day 1.1: GS-001 establish the GradStudio project identity -->
# GradStudio

GradStudio is being rebuilt from scratch as a hands-on engineering project.

This repository intentionally starts small and evolves through meaningful, working commits. The existing GradStudio implementation is used only as a product and architecture reference. Production code is not copied blindly into this repository.

<!-- Day 1.2: GS-001 define the engineering goal and evolution model -->
## Engineering goal

Build GradStudio the way a real engineering team could logically arrive at it:

1. identify a concrete product or engineering problem
2. discuss possible approaches
3. choose the smallest sensible implementation
4. implement it
5. run and verify it
6. commit the working change
7. introduce more architecture only when the product needs it

<!-- Day 1.3: GS-001 define the daily development workflow -->
## Daily development rule

Each detailed development day represents one primary engineering problem and one meaningful Git commit.

A day should include:

- engineering group discussion
- decision and reasoning
- exact files involved
- terminal commands
- implementation
- local verification
- Git diff review
- commit and push

<!-- Day 1.4: GS-001 define the build principles -->
## Build principles

- Do not copy the finished GradStudio application wholesale.
- Prefer a simple working solution before introducing infrastructure.
- Keep every commit understandable and runnable whenever practical.
- Introduce frontend, API, database, storage, authentication, analytics, security, and deployment capabilities when their requirements naturally appear.
- Ignore notes, generated previews, temporary logs, experiments, and other reference-repository artifacts that are not part of the actual product.
- Record technical debt instead of prematurely solving future problems.

<!-- Day 1.5: GS-001 establish the commit convention and baseline state -->
## Commit convention

Development commits use the GradStudio learning ticket prefix:

```text
GS-001 Initialize GradStudio project foundation
GS-002 ...
GS-003 ...
```

## Current state

**GS-001** establishes the project foundation and engineering workflow.

No application feature code has been added yet.
