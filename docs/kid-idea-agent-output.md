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
Levels" section with a Markdown table. GitHub will allow wide tables to scroll
horizontally when the viewport is narrow.

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

## PR Checklist

Every kid idea PR should include:

- Link to the source issue.
- Summary of actual changes.
- Before / After table for modification tasks.
- New Levels table for added levels.
- Playtest focus for the kid.
- Build or validation result.
