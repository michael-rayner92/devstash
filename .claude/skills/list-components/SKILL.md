---
name: list-components
description: List React components in src/components/
argument-hint: "[subdirectory]"
---

## Task

List all React component files (.tsx, .ts, .jsx, .js) in `src/components/`.

If a [subdirectory] is provided via $ARGUMENTS, only list files in `src/components/[subdirectory]`.

If the subdirectory doesn't exist, say "Subdirectory `[subdirectory]` not found in src/components/."

## Output Format

- Numbered list of files with relative paths
- Brief one-line description of each (infer from filename)
- Summary count at the end

If no files found, say "No components found."
