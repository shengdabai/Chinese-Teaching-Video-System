#!/bin/bash
# Source before any pipeline I/O. Project IDs are single, filter-safe directory names.
if [[ ! "${1:-}" =~ ^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$ ]]; then
    echo "❌ Invalid project ID: use 1-100 letters, digits, underscores or hyphens." >&2
    exit 1
fi

# Reject linked inputs and outputs, including dangling links, before FFmpeg can
# follow them or overwrite files. This assumes no concurrent filesystem changes.
PROJECT_DIR="projects/$1"
if [ -L projects ] || [ -L "$PROJECT_DIR" ]; then
    echo "❌ Project paths must not be symlinks." >&2
    exit 1
fi
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Project directory does not exist: $PROJECT_DIR" >&2
    exit 1
fi
if ! PROJECT_LINKS="$(find "$PROJECT_DIR" -type l -print -quit)"; then
    echo "❌ Could not validate project paths." >&2
    exit 1
fi
if [ -n "$PROJECT_LINKS" ]; then
    echo "❌ Project files and directories must not contain symlinks." >&2
    exit 1
fi
