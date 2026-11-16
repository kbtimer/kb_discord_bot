# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A Discord bot ("CKB Bot") for running online Knowledge Bowl tournaments. It builds a tournament server skeleton, creates competition rooms and team roles, and moves teams between rooms by editing permission overwrites. Built on discord.js v14 (the `UpgradeToV14` branch is the migration from older discord.js APIs).

## Running

```bash
npm install
npm test        # actually just runs `node tournament.js` — there is no test suite or linter
```

The bot reads its token from `config.json` (`{ "BOT_TOKEN": "..." }`). `config.json` and `config_official.json` are gitignored; never commit them. Testing is manual against a real Discord server — `testing.txt` holds a sequence of bot commands (create 14 rooms, create teams, assign teams to rooms, paint, empty) used to exercise a full round.

## Architecture

Everything lives in a single file, `tournament.js`:

- **Entry points**: `client.on('messageCreate')` splits each message on newlines and runs each line through `processCommand`, so several commands can be pasted in one message. A `client.on('raw')` handler deletes any poll not posted by a Control Room member and reports it to `#bot-commands`.
- **`processCommand`**: one big `if/else` chain matching on `command.indexOf('.x') === 0`. Each command has a short form (`.a`) and a natural-language alias (`.add`). Mentions are parsed by `getMentions` into `{roles, channels, users}`. A `--force` flag skips the 👍-reaction confirmation implemented in `confirm()`.
- **Permissions model**: `.w` (written secret code, only in channels with "lounge" in the name) is available to everyone. All other commands require the Control Room or Staff role, or the guild owner; some commands additionally check for Control Room only. Roles are identified **by name** (`hasRole(member, 'Control Room')`), so renaming roles breaks the bot.
- **`helpSections`**: the help text for each command, keyed by its short letter. Update it when you add or change a command.

### Server model (created by `init`, the `.i` command)

`init` **deletes every role and channel** in the guild, then creates:
- Roles: `Control Room` (Administrator), `Staff`, `Spectator`, `Coach`. Team roles must sit **below** `Coach`; `coachPosition()` is used to tell team roles from staff roles.
- Categories: `Control Room` (staff-only channels, including `bot-commands`), `Hub` (`announcements`, `general`, `lounge-text`, `hallway-voice`, lounge voice channels), and `Coaches Lounge`.

A **room** is a category containing `<name>-text` and `<name>-voice` (`createRoom`). Commands take the text channel as a mention and act on `channel.parent` (the category). Teams are added or removed by editing **the category's** permission overwrites for the team role (`add`, `remove`, `empty`). `Control Room` and `Hub` are protected from add and remove.

A **team** (`createTeam`, the `.n` command) is a role with a random color, plus a private `<Team> Lounge` room, plus view access to the Hub.

**Lockdown and open lounge** (`.l`/`.o`): these move every channel whose name matches `/lounge/` between `Hub` and a `Lockdown Lounge` category and re-sync permissions.

### Voice-channel text chat quirk

Discord voice channels have built-in text chat that inherits send permissions from the category. After any change to a category's overwrites, the code calls `disableVoiceChannelChatInCategory(category)`, which rewrites each voice channel's overwrites to deny SendMessages, AddReactions, and ReadMessageHistory. Keep this call in place whenever you change room permissions. `lockPerms(channel)` re-syncs a channel's overwrites with its parent category, and is typically called just before the voice-chat lockdown.
