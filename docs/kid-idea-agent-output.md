# Kid Idea Agent Output Requirements

These requirements apply to PRs created from kid idea issues.

## Modification Tasks

If the task changes an existing level, screen, visual state, copy location, or
gameplay behavior, the PR description must include a "Before / After" section.

- Put before and after images side by side whenever the changed behavior can be
  shown visually.
- Use a two-column Markdown table:

```markdown
## Before / After

| Before | After |
| --- | --- |
| ![Before](before-image-url) | ![After](after-image-url) |
```

- If screenshots cannot be produced in the agent environment, include the table
  anyway and write what should be captured manually.
- For non-visual behavior changes, use short bullet points in the two columns
  instead of images.

## New Level Tasks

If the task adds one or more levels, the PR description must include a "New
Levels" section with a Markdown table and screenshots of the new level. GitHub
will allow wide tables to scroll horizontally when the viewport is narrow.

Use these columns when the data exists:

```markdown
## New Levels

| Level | Game mode | Goal | New mechanics | Size / bounds | Main route | Alternate route | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 20 | Yarn Time | Reach the yarn | floating tile | maxX 14 | left-bottom to right-top | yes | build passed |
```

- Add one row per new level.
- Keep cells short so the table is easy to scan.
- For Yarn Time, mention `maxX` and whether the level was checked for
  reachability.
- If many levels are added, keep one wide table rather than a long prose list.
- Include at least one screenshot of the new level and one screenshot or clear
  note showing the completion path / key route.
- If the new level is a tutorial, state the single new mechanic it teaches.

## Reward Task Changes

If the task adds or edits an in-game reward/unlock task, the PR description must
include:

- A screenshot of the reward task list.
- A screenshot of the new/changed task in a relevant state: unfinished,
  claimable, or claimed.
- A short note describing the unlock condition and reward.

## Reward Item Changes

If the task adds or edits an accessory, expression, sticker, or other reward
item, the PR description must include:

- A screenshot of the reward list row.
- A screenshot of the try-on, preview, sticker share, or equivalent visual
  presentation.
- A screenshot or note for the locked/unlocked/claimed state.
- For stickers, include the world, trigger level, and camera / easter egg
  location.

## Game System Changes

If the task adds or edits a game system such as leaderboard, level easter eggs,
appearance system, tasks, sharing, or other meta-game features, the PR
description must include:

- A screenshot of the entry point.
- A screenshot of the main interaction state.
- A screenshot of the empty, loading, error, or unauthorized state when
  applicable.
- A risk note when the change touches cloud functions, privacy, account
  settings, payment, secrets, or release behavior.

## Missing Screenshots

If screenshots cannot be produced in the agent environment, include the required
section anyway and write exactly what should be captured manually, including the
page, state, and interaction needed to reproduce it.

## PR Checklist

Every kid idea PR should include:

- Link to the source issue.
- Summary of actual changes.
- Before / After table for modification tasks.
- New Levels table for added levels.
- Required screenshots for new levels, reward tasks, reward items, and game
  systems.
- Playtest focus for the kid.
- Build or validation result.
