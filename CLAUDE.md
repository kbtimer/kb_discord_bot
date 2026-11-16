# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A Discord bot ("CKB Bot") for running online Knowledge Bowl tournaments. It builds a tournament server skeleton, creates competition rooms and team roles, and moves teams between rooms by editing permission overwrites. Built on discord.js v14 (the `UpgradeToV14` branch is the migration from older discord.js APIs).

## Running

```bash
npm install
npm start       # runs the bot (`node tournament.js`) — connects to Discord with the real token
npm test        # offline syntax check only (`node --check`) — there is no test suite or linter
```

The bot reads its token from `config.json` (`{ "BOT_TOKEN": "..." }`). `config.json` and `config_official.json` are gitignored; never commit them. Testing is manual against a real Discord server — `testing.txt` holds a sequence of bot commands (create 14 rooms, create teams, assign teams to rooms, paint, empty) used to exercise a full round.

For tournaments the bot is hosted on a DigitalOcean droplet as a systemd service; see `deploy/README.md`. Only one copy may run per token, so stop the hosted one before running locally with the same `config.json`.

Run with `PROFILE=1 node tournament.js` to log, after each command, its wall time, API calls by route, and rate-limit waits; long waits and 429s print as they happen. Use it before optimizing: speed is usually set by round trips (~0.3s each) to Discord rather than by rate limits.

## Discord API limits

- **Channel creation** for a server goes one request at a time (one rate-limit bucket), so `.c`/`.n` are bounded by about 3 round trips per room. Set permission overwrites **in** `guild.channels.create()` rather than editing them afterwards.
- **Editing many overwrites on one channel** (e.g. one PUT per team on Hub) hits an undocumented limit that returns 429s; write the whole list in one `permissionOverwrites.set()` (`addTeamsToHub`).
- **Role creation is capped at 250 per server per ~48 hours.** Every team and every `.i` (4 roles) counts, so repeated full test rounds on one server exhaust it; use a fresh test server.
- The client is built with `rejectOnRateLimit` for waits over `MAX_RATE_LIMIT_WAIT_MS` (60s), so long limits throw a `RateLimitError` instead of silently stalling; `rateLimitMessage()` explains it in Discord. Routine few-second waits are still waited out.
- Batch commands post one start message, progress every `PROGRESS_INTERVAL_MS`, and one summary (`progressReporter`, `listNamesForMessage`) — not a message per item, since a channel takes only ~5 bot messages per 5 seconds. Use team **names**, not mentions, in bot messages: team roles are mentionable, so a mention pings every member. As a backstop the client sets `allowedMentions: { parse: ['users'] }`, so role tags in bot messages render but never ping.

## Architecture

Everything lives in a single file, `tournament.js`:

- **Entry points**: `client.on('messageCreate')` splits each message on newlines and runs each line through `processCommand`, so several commands can be pasted in one message. They run one at a time: `processCommand` awaits `confirm()`, so a confirm success callback must **return** (or await) its work, or the next line will start while it is still changing the same room's permissions. Messages containing a staff command also run one at a time per server (`runInGuildQueue`), because `addTeamsToHub` and `empty` read a whole overwrite list and write it back with `set()`, so overlapping commands could undo each other's changes; a queued message gets a ⏳ reaction until it starts. Ordinary chat and `.w` skip the queue. A `client.on('raw')` handler deletes any poll not posted by a Control Room member and reports it to `#bot-commands`.
- **`processCommand`**: one big `if/else` chain matching on `cmd === 'x'`, where `cmd = commandName(command)`. Each command has a short form (`.a`) and a natural-language alias (`.add`), both listed in `COMMAND_NAMES`; the first word must match one exactly, so `.done` is not `.d`. Add new commands and aliases there. Mentions are parsed by `getMentions` into `{roles, channels, users}`. A `--force` flag skips the 👍-reaction confirmation implemented in `confirm()`.
- **Permissions model**: `.w` (written secret code, only in channels with "lounge" in the name) is available to everyone. All other commands require the Control Room or Staff role, or the guild owner; some commands additionally check for Control Room only. Roles are identified **by name** (`hasRole(member, 'Control Room')`), so renaming roles breaks the bot.
- **`helpSections`**: the help text for each command, keyed by its short letter. Update it when you add or change a command. Discord caps an embed at 6000 characters, so `help()` sends the full help as two embeds (setup commands, then the rest from `.a`) and starts another one if a part would still exceed `MAX_EMBED_LENGTH`.
- **`.v` (`verifyServer`)**: a read-only check (Control Room only) that re-fetches roles and channels and reports drift from the invariants in this file: a team in two rooms, a room team missing what `.a` gives it (`teamPermissionGaps`, e.g. able to read earlier rounds), a team lounge with anyone but @everyone and its own team, rooms or lounges visible to everyone, channels that don't match their category (`matchesCategory` expects exactly what `syncCategoryChannels`/`createRoom`/`empty` write), voice chat left on, a half-done `.l`/`.o`, and categories the bot can't manage. When you add an invariant, add its check there.

### Server model (created by `init`, the `.i` command)

`init` **deletes every role and channel** in the guild, then creates:
- Roles: `Control Room` (Administrator), `Staff`, `Spectator`, `Coach`. Team roles must sit **below** `Coach`; `coachPosition()` is used to tell team roles from staff roles.
- Categories: `Control Room` (staff-only channels, including `bot-commands`), `Hub` (`announcements`, `general`, `lounge-text`, `hallway-voice`, lounge voice channels), and `Coaches Lounge`.

A **room** is a category containing `<name>-text` and `<name>-voice` (`createRoom`). Commands take the text channel as a mention and act on `channel.parent` (the category). Teams are added or removed by editing **the category's** permission overwrites for the team role (`add`, `remove`, `empty`). `Control Room` and `Hub` are protected from add and remove. So is any category with "lounge" in its name (team lounges, `Coaches Lounge`, `Lockdown Lounge`): `.a` and `.t` refuse them, `.r` refuses only to remove a team from its own lounge (`<Team> Lounge`), and `.c` refuses room names containing "lounge" so a competition room never matches. `.e` and `.d` accept only categories that pass `isCompetitionRoom` (exactly one text and one voice channel, not Control Room, Hub, or a lounge); a team lounge also has a text and a voice channel, so the channels alone aren't enough.

`createRoom` and `createTeam` are all-or-nothing: on failure they delete what they already made (`rollBack`) and rethrow, attaching anything they couldn't delete as `error.leftovers`, which `.c`/`.n` report via `leftoversMessage`. `.c` refuses names matching an existing category, and `.n` refuses a name whose `<Team> Lounge` category already exists.

A **team** (`createTeam`, the `.n` command) is a role with a random color, plus a private `<Team> Lounge` room, plus view access to the Hub. `.n` builds `TEAM_CREATION_CONCURRENCY` teams at a time, then grants Hub access to all of them in one call (`addTeamsToHub`) and runs `syncHubChannels`. A name that is already a finished team (`existingTeamRole`: a team role with its lounge) is skipped rather than rejected, and `addTeamsToHub` only adds overwrites for roles that lack one, so re-running a `.n` whose Hub step failed finishes its teams without undoing lockdown.

**Lockdown and open lounge** (`.l`/`.o`): these move every channel whose name matches `/lounge/` between `Hub` and a `Lockdown Lounge` category and re-sync permissions. `moveLoungesAndSync` moves with `lockPermissions: false`, then syncs **every** lounge channel in the destination, not just the ones it moved, so rerunning `.l`/`.o` repairs a channel whose move worked but whose sync failed last time.

### Voice-channel text chat quirk

Discord voice channels have built-in text chat that inherits send permissions from the category. Every voice channel's overwrites must deny SendMessages, AddReactions, and ReadMessageHistory, so after any change to a category's overwrites the voice channels must be rewritten. Two ways this is done:
- `syncRoom`/`syncHubChannels` (via `syncCategoryChannels`) re-fetch the category, sync text channels (`lockPermissions`), and set each voice channel's overwrites to the category's list `map(withVoiceChatDenied)`. They try every channel even after one fails (`updateEveryChannel`), then throw, so one failure can't leave another channel with a removed team's access.
- `createRoom` and `empty` write the final overwrites directly: the text channel gets exactly the category's list (so it counts as synced) and the voice channel gets `overwrites.map(withVoiceChatDenied)`. This takes far fewer API calls.

Keep one of these in place whenever you change room permissions. `lockPermissions()` copies the category's **cached** overwrites, which can be stale right after an edit, so re-fetch the category (`category.fetch(true)`) first, once per category.
