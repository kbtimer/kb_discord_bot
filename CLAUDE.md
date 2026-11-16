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

Run with `PROFILE=1 node tournament.js` to log, after each command, its wall time, API calls by route, and rate-limit waits; long waits and 429s print as they happen. Use it before optimizing: speed is usually set by round trips (~0.3s each) to Discord rather than by rate limits.

## Discord API limits

- **Channel creation** for a server goes one request at a time (one rate-limit bucket), so `.c`/`.n` are bounded by about 3 round trips per room. Set permission overwrites **in** `guild.channels.create()` rather than editing them afterwards.
- **Editing many overwrites on one channel** (e.g. one PUT per team on Hub) hits an undocumented limit that returns 429s; write the whole list in one `permissionOverwrites.set()` (`addTeamsToHub`).
- **Role creation is capped at 250 per server per ~48 hours.** Every team and every `.i` (4 roles) counts, so repeated full test rounds on one server exhaust it; use a fresh test server.
- The client is built with `rejectOnRateLimit` for waits over `MAX_RATE_LIMIT_WAIT_MS` (60s), so long limits throw a `RateLimitError` instead of silently stalling; `rateLimitMessage()` explains it in Discord. Routine few-second waits are still waited out.
- Batch commands post one start message, progress every `PROGRESS_INTERVAL_MS`, and one summary (`progressReporter`, `listNamesForMessage`) — not a message per item, since a channel takes only ~5 bot messages per 5 seconds. Use team **names**, not mentions, in bot messages: team roles are mentionable, so a mention pings every member.

## Architecture

Everything lives in a single file, `tournament.js`:

- **Entry points**: `client.on('messageCreate')` splits each message on newlines and runs each line through `processCommand`, so several commands can be pasted in one message. They run one at a time: `processCommand` awaits `confirm()`, so a confirm success callback must **return** (or await) its work, or the next line will start while it is still changing the same room's permissions. A `client.on('raw')` handler deletes any poll not posted by a Control Room member and reports it to `#bot-commands`.
- **`processCommand`**: one big `if/else` chain matching on `command.indexOf('.x') === 0`. Each command has a short form (`.a`) and a natural-language alias (`.add`). Mentions are parsed by `getMentions` into `{roles, channels, users}`. A `--force` flag skips the 👍-reaction confirmation implemented in `confirm()`.
- **Permissions model**: `.w` (written secret code, only in channels with "lounge" in the name) is available to everyone. All other commands require the Control Room or Staff role, or the guild owner; some commands additionally check for Control Room only. Roles are identified **by name** (`hasRole(member, 'Control Room')`), so renaming roles breaks the bot.
- **`helpSections`**: the help text for each command, keyed by its short letter. Update it when you add or change a command.

### Server model (created by `init`, the `.i` command)

`init` **deletes every role and channel** in the guild, then creates:
- Roles: `Control Room` (Administrator), `Staff`, `Spectator`, `Coach`. Team roles must sit **below** `Coach`; `coachPosition()` is used to tell team roles from staff roles.
- Categories: `Control Room` (staff-only channels, including `bot-commands`), `Hub` (`announcements`, `general`, `lounge-text`, `hallway-voice`, lounge voice channels), and `Coaches Lounge`.

A **room** is a category containing `<name>-text` and `<name>-voice` (`createRoom`). Commands take the text channel as a mention and act on `channel.parent` (the category). Teams are added or removed by editing **the category's** permission overwrites for the team role (`add`, `remove`, `empty`). `Control Room` and `Hub` are protected from add and remove.

A **team** (`createTeam`, the `.n` command) is a role with a random color, plus a private `<Team> Lounge` room, plus view access to the Hub. `.n` builds `TEAM_CREATION_CONCURRENCY` teams at a time, then grants Hub access to all of them in one call (`addTeamsToHub`) and runs `syncHubChannels`.

**Lockdown and open lounge** (`.l`/`.o`): these move every channel whose name matches `/lounge/` between `Hub` and a `Lockdown Lounge` category and re-sync permissions.

### Voice-channel text chat quirk

Discord voice channels have built-in text chat that inherits send permissions from the category. Every voice channel's overwrites must deny SendMessages, AddReactions, and ReadMessageHistory, so after any change to a category's overwrites the voice channels must be rewritten. Two ways this is done:
- `syncRoom`/`syncHubChannels` re-sync the channels with the category (`lockPermissions`), then call `disableVoiceChannelChatInCategory(category)`.
- `createRoom` and `empty` write the final overwrites directly: the text channel gets exactly the category's list (so it counts as synced) and the voice channel gets `overwrites.map(withVoiceChatDenied)`. This takes far fewer API calls.

Keep one of these in place whenever you change room permissions. `lockPermissions()` copies the category's **cached** overwrites, which can be stale right after an edit, so re-fetch the category (`category.fetch(true)`) first, once per category.
