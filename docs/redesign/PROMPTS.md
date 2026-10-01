# Prompts for the redesign sessions

Copy one of these into a new Claude Code session opened in this repository. Everything Claude needs is in `docs/redesign/`.

## 1. First session

```
We are implementing a UI redesign of this Expo React Native app (Pianoverse). The plan, the rules and the design spec are in docs/redesign/.

1. Read docs/redesign/PLAN.md and docs/redesign/SPEC.md completely, before touching any code. Follow the "Working rules" in PLAN.md exactly.
2. The design boards are in docs/redesign/boards/ (inline-styled HTML, open the one for the screen you are building and copy its exact sizes, colours and spacing). The live canvas is https://claude.ai/artifact/CAcG5EBb9ySAiSHWUE5Kez if you can read it.
3. Start with Batch 0. Create the branch redesign/v2, then do the sub-tasks in order. Tick each sub-task in PLAN.md the moment it is done.
4. When the batch is done: run npm run typecheck, npm test and npm run lint, fix anything that fails, commit, add a Session log entry in PLAN.md, and show me (a) a short "how to check this batch" list and (b) the exact prompt for the next session.
5. Do not start the next batch. If something in the design conflicts with the code, follow SPEC section 8, otherwise pick the lowest-risk option, record it under Decisions, and tell me.
```

## 2. Every later session (continue)

```
Continue the Pianoverse UI redesign. 

1. Read docs/redesign/PLAN.md (Progress, Decisions and Session log) and docs/redesign/SPEC.md. Run git status and git log --oneline -10 and check they match the Session log. If the last session stopped in the middle of a batch, look at git diff and continue from the first unticked sub-task.
2. Do the next unticked batch, following the "Working rules" in PLAN.md. Read the boards named in that batch's notes before building each screen.
3. Tick sub-tasks as you finish them. At the end: typecheck, tests and lint must pass, then commit, add a Session log entry, and give me the "how to check" list and the exact prompt for the next session.
4. Do not start the following batch.
```

## 3. Optional add-ons

Use these by adding a line to the continue prompt.

- **Do more than one batch:** "Do batches 4 and 5 in this session, committing after each."
- **Running low on the 5-hour limit:** "I have about 30 minutes left. Finish or safely stop the current sub-task, make sure checks pass or note exactly what is failing, commit, and update PLAN.md so I can resume."
- **Resume after a crash:** "The last session was cut off. Compare git diff with PLAN.md, tell me what is half done, and finish only that."
- **Fix something after checking on a device:** "Batch N is done but on my phone <describe the problem>. Fix that only, compare with the board <Name>, and log it under Decisions."
- **Skip a batch:** "Skip batch N for now and mark it as skipped in PLAN.md with the reason."
