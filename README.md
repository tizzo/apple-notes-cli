# apple-notes-cli

A command-line interface for managing Apple Notes on macOS, built on JXA (JavaScript for Automation).

## Install

```bash
npm install
npm run build
npm link
```

This makes the `notes` command available globally.

On first run, macOS will prompt you to allow Terminal (or your terminal app) to control Notes.app. This is a one-time permission grant.

## Usage

```bash
notes <command> [options]
```

All commands output JSON by default. Use `--format pretty` for human-readable output.

### List notes

```bash
notes list                          # all notes
notes list --limit 10               # first 10
notes list --folder "Notes"         # filter by folder
notes list --account "iCloud"       # filter by account
```

### Show a note

```bash
notes show "Grocery List"           # by name
notes show "x-coredata://..."      # by ID
```

Returns the full note including HTML body, plaintext, metadata, and attachment count.

### Search

```bash
notes search "camping"              # search note content
notes search "packing" --title-only # search titles only (faster)
notes search "recipe" --limit 5     # limit results
notes search "work" --folder "Notes" # filter by folder
```

Content search uses `plaintext contains` (~0.4s) rather than `body contains` (~77s).

### Create a note

```bash
notes create "Meeting Notes"                          # empty note
notes create "Shopping" --body-text "Milk, eggs"      # plain text body
notes create "Report" --body "<h1>Q1</h1><p>...</p>" # HTML body
notes create "Work Item" --folder "Work" --account "iCloud"
```

### Update a note

```bash
notes update "Shopping" --append-text "Bread, butter"  # append plain text
notes update "Shopping" --append "<div>Cheese</div>"   # append HTML
notes update "Shopping" --body "<div>New list</div>"   # replace body
notes update "Shopping" --title "Grocery List"          # rename
```

### Delete a note

```bash
notes delete "Old Note"             # moves to Recently Deleted
notes delete "x-coredata://..."    # by ID
```

### Move a note

```bash
notes move "My Note" --to "Archive"
notes move "My Note" --to "Work" --account "iCloud"
```

### Folders

```bash
notes folders                                # list all folders
notes folders --account "iCloud"             # filter by account
notes folders create "Projects"              # create folder
notes folders create "Sub" --parent "Projects" # create subfolder
```

### Accounts

```bash
notes accounts                      # list all accounts with note/folder counts
```

### Full help dump

```bash
notes help-all                      # print help for every command (useful for AI agents)
```

## Note identifiers

Notes can be referenced by **name** or **full ID** (`x-coredata://...`). If multiple notes share the same name, use the ID from `notes list` to target a specific one.

## Limitations

- **Password-protected notes**: detected in listings but content cannot be read
- **Tags and smart folders**: not exposed by Apple's scripting interface
- **Attachments**: metadata is available but binary content is not read/written through this CLI
- **macOS only**: requires `osascript` and Notes.app

## Development

```bash
npm run dev -- list --limit 5       # run without building via tsx
npm run build                       # compile to dist/
npm run typecheck                   # type-check without emitting
npm test                            # run unit tests
```

## License

MIT
