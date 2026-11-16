const { Client, Events, GatewayIntentBits, GuildDefaultMessageNotifications, PermissionFlagsBits, PermissionsBitField, OverwriteType, Colors, ChannelType, AuditLogEvent, ActivityType, Role } = require('discord.js');
const fs = require('fs');
// Normally discord.js quietly waits out rate limits, which is right for the few-second waits that are
// routine here. But some Discord limits last for days (servers get 250 new roles per 48 hours), and waiting
// those out looks like a frozen bot. Anything longer than this fails instead, with a RateLimitError that
// rateLimitMessage() turns into an explanation.
const MAX_RATE_LIMIT_WAIT_MS = 60 * 1000;

const client = new Client({ intents: [GatewayIntentBits.Guilds,
																			GatewayIntentBits.GuildMessages,
																			GatewayIntentBits.MessageContent,
																			GatewayIntentBits.GuildMessageReactions,
																			GatewayIntentBits.GuildMembers],
														// Team roles are mentionable, so a role mention in a bot message would ping every member.
														// Only user mentions (.g/.u) ping; role tags still display.
														allowedMentions: { parse: ['users'] },
														rest: { rejectOnRateLimit: data => data.timeToReset > MAX_RATE_LIMIT_WAIT_MS } });
const config = require("./config.json");

var helpSections = {
  'i': {
		name: 'Initialize Server',
		value: 'This command __deletes every preexisting channel and role in the server__ and replaces them with a predetermined tournament server skeleton. The CKB Bot role needs to be the highest in the server for this command to run properly. You must specify the name of the server (yours is %ServerName%) to avoid accidentally running the command while on the wrong server.  This command can only be run by the server owner.\nExample bot-style usage: `.i %ServerName%`\nExample NL-style usage: `.initialize-server %ServerName%`'
  },
	'g': {
		name: 'Grant Control Room Privileges',
		value: 'This command can only be run by users with the Control Room role.  It assigns the Control Room role.  __BE CAREFUL WITH THIS.__  Anyone with the Control Room role can add others to control room, block users, delete rooms, and delete the server.  They have full administrative access, so be sure everyone who has Control Room understands their great power and great responsibility.\nExample bot-style usage: `.g @username`\nExample NL-style usage: `.grant-control-room @username`'
	},
	'u': {
		name: 'Un-grant Control Room Privileges',
		value: 'This command can only be run by users with the Control Room role.  It removes the Control Room role from a user.\nExample bot-style usage: `.u @username`\nExampleNL-style usage: `.ungrant-control-room @username`'
	},
  'c': {
		name: 'Create Room[s]',
		value: 'This command can only be run by users with the Control Room role. Room names must be less than 90 characters long, cannot contain "lounge", cannot be "Control Room" or "Hub", and cannot match the name of a category that already exists. Surround the room names with double quotation marks. If you want to create multiple rooms at a time, separate the room names with spaces. \nExample bot-style usage: `.c "Room 1" "Room 2"`\nExample NL-style usage: `.create "Room 1" "Room 2"`'
  },
  //'f': {
	//name: 'Create Finals Room',
	//value: 'This command creates a special finals room that contains a channel for the playing teams to type in and a channel for everyone else to comment in. The command requires you to tag the two teams who are competing in the finals. Teams cannot be added or removed from a finals room. This command can only be run by users with the Control Room role.\nExample bot-style usage: `.f @A2 @B1`\nExample NL-style usage: `.finals @A2 and @B1`'
  //},
  'd': {
		name: 'Delete Room',
		value: 'This command can only be run by users with the Control Room role.  It deletes rooms made with `.c`; it will not delete lounges, Hub, or Control Room.\nExample bot-style usage: `.d #room-1-text`\nExample NL-style usage: `.delete #room-1-text`'
  },
  'b': {
		name: 'Manually Create/Delete Team',
		value: 'Team roles can be created manually in your tournament server\'s settings. Make sure all team roles are __below__ the Coach role, do not use any pre-existing role names, and are mentionable.'
  },
	'n': {
		name: 'New Team[s]',
		value: 'This command can only by run by users with the Control Room role.  Specify a list of teams names to create in double quotation marks, separated by spaces. Team names must be less than 89 characters long and cannot match a role that already exists (such as Staff or Coach), except a team made by an earlier `.n`: that team is not created again, but it is given Hub access if it is missing, so a `.n` that failed partway can simply be run again.\nExample bot-style usage: `.n "AHS-A" "AHS-B" "BHS-A" "BHS-B"`\nExample NL-style usage: `.new-teams "AHS-A" "AHS-B" "BHS-A" "BHS-B"`'
	},
  //'m': {
	//	name: 'Mass Create Teams',
	//	value: 'This command can only be run by users with the Control Room role. Specify a prefix and a range of numbers using this notation: `Prefix[Start...End]`. The bot will automatically create roles for each number in the specified range, randomly assign colors, and create lounges.\nExample bot-style usage: `.m Team[1...3]`\nExample NL-style usage: `.mass-create-teams Team[1...3]`'
  //},
	//    's': {
	//	name: 'Create Room Schedules from Google Sheets',
	//	value: 'This command can only be run by users with the Control Room role. This command is fairly complicated, so ask Karan how to use it.'
	//    },
  'a': {
		name: 'Add Team(s) to Room',
		value: 'This command can be run by Control Room or Staff roles. Specify one or more teams by their roles to add. Teams cannot be added to lounges.\nExample bot-style usage: `.a @A2 @A3 #room-1-text`\nExample NL-style usage: `.add @A2 @A3 to #room-1-text`'
  },
  'r': {
		name: 'Remove Team(s) from Room',
		value: 'This command can be run by Control Room or Staff roles. Specify one or more teams by their roles to remove. A team cannot be removed from its own lounge.\nExample bot-style usage: `.r @A2 @A3 #room-1-text`\nExample NL-style usage: `.remove @A2 @A3 from #room-1-text`'
  },
  't': {
		name: 'Transfer Team(s) between Rooms',
		value: 'This command can be run by Control Room or Staff roles. Specify one or more teams by their roles. It requires you to tag two channels; tag the room that you are transferring the teams __from__ first, and tag the channel that you are transferring the teams __to__ second. Neither can be a lounge.\nExample bot-style usage: `.t @A2 @A3 #room-1-text #room-3-text`\nExample NL-style usage: `.transfer @A2 @A3 from #room-1-text to #room-3-text`'
  },
  'e': {
		name: 'Empty Room',
		value: 'This command can only be run by users with the Control Room role.  It removes all teams from a given room.  It will not empty lounges, Hub, or Control Room.\nExample bot-style usage: `.e #room-1-text`\nExample NL-style usage: `.empty #room-1-text`'
  },
	'p': {
		name: 'Paint a Team',
		value: 'This command can be run by Control Room or Staff roles.  It changes the color of a team role.\nExample bot-style usage: `.p @Team1`\nExample NL-style usage: `.paint @Team1`'
	},
	'w': {
		name: 'Written Secret Code',
		value: 'This command can be run by anyone in a text channel with lounge in the name.  It outputs a secret code for the written.\nExample bot-style usage: `.w`\nExample NL-style usage: `.written-code`'
	},
	'l': {
		name: 'Lockdown Lounge',
		value: 'This command can only be run by users with the Control Room Role.  It removes permissions to post in hub (should be overridden by #general), thus locking the lounge.\nExample bot-style usage: `.l`\nExample NL-style usage: `.lockdown-lounge`'
	},
	'o': {
		name: 'Open Lounge',
		value: 'This command can only be run by users with the Control Room Role.  It adds permissions to post in hub, thus unlocking the lounge.\nExample bot-style usage: `.o`\nExample NL-style usage: `.open-lounge`'
	},
  'h': {
		name: 'Display This Help',
		value: 'Example bot-style usage: `.h`\nExample NL-style usage: `.help`'
  }
}

var hasRole = function (member, roleName) {
	//console.log("Checking if " + member.guild.name + " has role " + roleName);
	const roleNames = member?.roles?.cache?.map(r => r.name);
	if(roleNames?.includes(roleName)) {
		//console.log("Found role " + roleName);
		return true;
	}
	//console.log("Didn't find role " + roleName);
  return false;
}

// Room and team names must be shorter than these so that "<room>-text" (5 more characters) and
// "<team>-lounge-text" (12 more) fit in Discord's 100-character channel name limit.
const MAX_NAME_LENGTH = 90;
const MAX_TEAM_NAME_LENGTH = 89;

// Roles the bot finds by name. A team with one of these names would get that role's powers
// from hasRole(), and empty() would never clear it out of a room.
const RESERVED_ROLE_NAMES = ['@everyone', 'Control Room', 'Staff', 'Spectator', 'Coach'];

// Categories that .a/.r/.t refuse to touch, so .c can't create rooms with these names (lowercase)
const RESERVED_CATEGORY_NAMES = ['control room', 'hub'];

// True if category is a room made by .c: two channels, and not Control Room, Hub, or a lounge (team lounges,
// Coaches Lounge, Lockdown Lounge). Team lounges also have exactly two channels, so the name check matters.
// .c refuses room names containing "lounge", so this never rejects a real room.
var isCompetitionRoom = function (category) {
	return !!category && category.type === ChannelType.GuildCategory && category.children.cache.size === 2 &&
		!RESERVED_CATEGORY_NAMES.includes(category.name.toLowerCase()) && !/lounge/i.test(category.name);
}

var roleNameInUse = function (guild, name) {
	var lower = name.toLowerCase();
	return RESERVED_ROLE_NAMES.some(reserved => reserved.toLowerCase() === lower) ||
		guild.roles.cache.some(role => role.name.toLowerCase() === lower);
}

// Returns the team role named `name` if .n already made it (a team role with its "<name> Lounge" category), else null.
// A team role made by hand has no lounge, so it doesn't count.
var existingTeamRole = function (guild, name, coachPos) {
	var lower = name.toLowerCase();
	var role = guild.roles.cache.find(r => r.name.toLowerCase() === lower);
	if (!role || !isTeamRole(role, coachPos)) {
		return null;
	}
	var loungeName = lower + ' lounge';
	var hasLounge = guild.channels.cache.some(channel => channel.type === ChannelType.GuildCategory && channel.name.trim().toLowerCase() === loungeName);
	return hasLounge ? role : null;
}

var lockPerms = async function (channel) {
  // syncs channel's perms with its parent category.
  // lockPermissions() copies the category's *cached* overwrites, and permissionOverwrites.edit()/delete()
  // don't update that cache (it waits for Discord's update event), so re-fetch the category first.
  // Otherwise a team that was just removed can be copied right back onto the channels.
  await channel.parent.fetch(true);
  await channel.lockPermissions();
	return Promise.resolve("Success");
}

// Copies a room category's permissions to its channels, then turns voice-channel chat back off.
var syncRoom = async function (category) {
	// Re-fetch once for the whole category; see lockPerms for why
	await category.fetch(true);
	for(var [flake, channel] of category.children.cache) {
		await channel.lockPermissions();
	}
	await disableVoiceChannelChatInCategory(category);
}

// "A", "A and B", "A, B, and C"
var listNames = function (items) {
	var names = items.map(item => item.toString());
	if (names.length <= 2) {
		return names.join(' and ');
	}
	return names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
}

// "3 minutes", "47 hours"
var describeDuration = function (ms) {
	var minutes = Math.ceil(ms / 60000);
	if (minutes < 120) {
		return minutes + ' minute' + (minutes === 1 ? '' : 's');
	}
	return Math.round(minutes / 60) + ' hours';
}

// If error is a long Discord rate limit (see MAX_RATE_LIMIT_WAIT_MS), returns a sentence explaining it for
// the channel; otherwise returns null.
var rateLimitMessage = function (error) {
	// discord.js names it "RateLimitError[<route>]"
	if (!error || !String(error.name).startsWith('RateLimitError')) {
		return null;
	}
	var wait = describeDuration(error.timeToReset);
	if (error.method?.toUpperCase() === 'POST' && error.route === '/guilds/:id/roles') {
		return 'Discord allows only ' + error.limit + ' new roles per server every 48 hours, and this server has used them up ' +
			'(every team and every `.i` creates roles). New roles can be created again in about ' + wait + '.';
	}
	return 'Discord is rate-limiting the bot on ' + error.method?.toUpperCase() + ' ' + error.route + ' for about ' + wait + '. Please try again then.';
}

// Batch commands post one summary at the end instead of a message per item. Discord lets the bot post only
// about 5 messages per 5 seconds in a channel, so per-item messages trailed the real work by many seconds.
// Long batches post a start message and then this often report progress, so nobody thinks the bot froze.
const PROGRESS_INTERVAL_MS = 10000;

// Returns a function to call after each item finishes. It posts "<progressText(done)> . . ." at most
// every PROGRESS_INTERVAL_MS, and never for the last item, since the summary follows right after.
var progressReporter = function (channel, total, progressText) {
	var done = 0;
	var last = Date.now();
	return function () {
		done++;
		if (done < total && Date.now() - last >= PROGRESS_INTERVAL_MS) {
			last = Date.now();
			channel.send(progressText(done) + ' . . .').catch(console.error);
		}
	};
}

// Like listNames, but falls back to a count so a summary stays under Discord's 2000-character limit
var listNamesForMessage = function (items, noun) {
	var names = listNames(items);
	return names.length <= 1500 ? names : items.length + ' ' + noun;
}

const USERS_PATTERN = /<@!?(\d{17,19})>/;
const ROLES_PATTERN = /<@&(\d{17,19})>/;
const CHANNELS_PATTERN = /<#(\d{17,19})>/;

function getUserIDFromMention(mention) {
	const matches = mention.match(USERS_PATTERN);
	if(!matches) return false;
	const id = matches[1];
	return id;
}
function getChannelIDFromMention(mention) {
	const matches = mention.match(CHANNELS_PATTERN);
	if(!matches) return false;
	const id = matches[1];
	return id;
}
function getRoleIDFromMention(mention) {
	const matches = mention.match(ROLES_PATTERN);
	if(!matches) return false;
	const id = matches[1];
	return id;
}

var getMentions = async function (content, guild) {
  var splitOnSpaces = content.split(/\s+/);
  var mentions = {
    roles: [],
    channels: [],
		users: []
  };
  for (var substr of splitOnSpaces) {
		var id = false;
		if(id = getUserIDFromMention(substr)) {
			// fetch, not resolve: members aren't all cached, and resolve only checks the cache.
			// Mentions of people who aren't in the server are skipped.
			var member = await guild.members.fetch(id).catch(() => null);
			if(member) {
				mentions.users.push(member);
			}
		} else if (id = getRoleIDFromMention(substr)) {
			mentions.roles.push(guild.roles.resolve(id));
		} else if (id = getChannelIDFromMention(substr)) {
			mentions.channels.push(guild.channels.resolve(id));
		}
	}

  /*
     if (substr[0] === '<' && substr[substr.length - 1] === '>') {
      if (substr.length === 22 && substr[1] === '@' && substr[2] === '&') {
        var snowflake = substr.replace(/[\<\@\&\>]/g, '');
        mentions.roles.push(guild.roles.resolve(snowflake));
			} else if (substr.match(USERS_PATTERN)) {
				var snowflake = substr.replace(/[\<\@\\!>]/g, '');
				mentions.users.push(guild.members.resolve(snowflake));
      } else if (substr.length === 21 && substr[1] === '#') {
        var snowflake = substr.replace(/[\<\#\>]/g, '');
        mentions.channels.push(guild.channels.resolve(snowflake));
      }
    }
  */
  return mentions;
}

// A team role sits below Coach. @everyone (whose ID is the server's ID) and roles managed by an integration
// such as a bot can sit there too but aren't teams; removing @everyone's overwrite from a room would make the
// room visible to the whole server. A mention of a deleted or unknown role resolves to null.
var isTeamRole = function (role, coachPos) {
	return !!role && role.id !== role.guild.id && !role.managed && role.position < coachPos;
}

// Names a role in a bot message without pinging anyone: "@everyone" in message text pings the whole server
var describeRole = function (role) {
	if (!role) {
		return 'an unknown role';
	}
	return role.id === role.guild.id ? 'the everyone role' : '"' + role.name + '"';
}

var coachPosition = async function(guild) {
	var coachRole = guild.roles.cache.find(r => r.name === 'Coach');
	if(coachRole === undefined) {
		return -1;
	}
	return coachRole.position;
}

var removeSendReactHistory = async function(overwrite) {
	await overwrite.edit({
		SendMessages: false,
		AddReactions: false,
		ReadMessageHistory: false
	});
	return Promise.resolve("Success");
}

// The permissions that control a voice channel's built-in text chat
const VOICE_CHAT_PERMISSIONS = [PermissionFlagsBits.SendMessages,
																PermissionFlagsBits.AddReactions,
																PermissionFlagsBits.ReadMessageHistory];

// Returns a copy of an overwrite ({id, type, allow, deny}, or a PermissionOverwrites) with voice chat denied
var withVoiceChatDenied = function(overwrite) {
	return {
		id: overwrite.id,
		// without type, discord.js must look the id up in its cache, and throws for uncached users
		type: overwrite.type,
		allow: new PermissionsBitField(overwrite.allow ?? 0n).remove(VOICE_CHAT_PERMISSIONS),
		deny: new PermissionsBitField(overwrite.deny ?? 0n).add(VOICE_CHAT_PERMISSIONS)
	};
}

var disableVoiceChannelChatInCategory = async function(category) {
	for(var [flake, channel] of category.children.cache) {
		if (channel.type === ChannelType.GuildVoice) {
			await channel.permissionOverwrites.set([...channel.permissionOverwrites.cache.values()].map(withVoiceChatDenied));
		}
	}
}

var syncVoiceChannelsToCategory = async function(category) {
	var promises = Array();
	for(var [flake, channel] of category.children.cache) {
		if (channel.type === ChannelType.GuildVoice) {
			promises.push(lockPerms(channel));
		}
	}
	await Promise.all(promises);
}

// Copies the Hub category's permissions to its channels, then turns voice-channel chat back off.
// general and announcements are skipped because they have their own @everyone permissions on purpose.
var syncHubChannels = async function(hubCategory) {
	// Re-fetch once for the whole category; see lockPerms for why
	await hubCategory.fetch(true);
	for(var [flake, channel] of hubCategory.children.cache) {
		if (channel.name !== 'general' && channel.name !== 'announcements') {
			await channel.lockPermissions();
		}
	}
	await disableVoiceChannelChatInCategory(hubCategory);
}

//Does not fix voice channel permissions
var addTeamToRoom = async function(role, to, channel) {
  await to.permissionOverwrites.edit(role, {
		ViewChannel: true,
		SendMessages: true,
		Connect: true,
		AddReactions: true,
		ReadMessageHistory: false,
		Speak: true
		//'USE_EXTERNAL_EMOJIS': true,
		//'ATTACH_FILES': true,
		//'EMBED_LINKS': true
  });
	if(channel) {
		channel.send('Team ' + role.name + ' has been added to room "' + to.name + '."');
	}
	return Promise.resolve("Success");
}

var addTeamsToRoom = async function(roles, to, channel) {
	var promises = Array();
	for(var i=0; i<roles.length; i++) {
		var currRole = roles[i];
		promises.push(addTeamToRoom(currRole, to));
	}
	await Promise.all(promises);
}

// readHistory is true only for a team's own lounge; competition rooms hide earlier messages
var add = async function (roles, to, readHistory = false) {
	for (var role of roles) {
		await to.permissionOverwrites.edit(role, {
			ViewChannel: true,
			SendMessages: true,
			Connect: true,
			AddReactions: true,
			ReadMessageHistory: readHistory,
			Speak: true
		});
	}
	await syncRoom(to);
}

var remove = async function (roles, from) {
	for (var role of roles) {
		await from.permissionOverwrites.delete(role);
	}
	await syncRoom(from);
}

// Recolors each team with paint(role) and posts one summary
var paintTeams = async function (channel, roles, paint) {
	var failed = [];
	await Promise.all(roles.map(role => paint(role).catch(function (error) {
		console.error('Could not recolor ' + role.name + ':', error);
		failed.push(role);
	})));
	var painted = roles.filter(role => !failed.includes(role));
	if (painted.length > 0) {
		await channel.send((painted.length === 1 ? 'Team ' : 'Teams ') + listNamesForMessage(painted.map(role => role.name), 'teams') +
			(painted.length === 1 ? ' has' : ' have') + ' been given a new color.');
	}
	if (failed.length > 0) {
		await channel.send('Could not recolor ' + listNamesForMessage(failed.map(role => role.name), 'teams') + '.');
		help(channel, ['p']);
	}
}

var recolor = async function (role) {
	await role.setColors({ primaryColor: randomColor() });
	return role.toString();
}

var recolorTo = async function (role, color) {
	await role.setColors({ primaryColor: color });
	return role.toString();
}

// Roles that stay in a room when it's emptied; every other overwrite (teams, individual users) is removed
const ROOM_KEPT_ROLE_NAMES = ['@everyone', 'Staff', 'Spectator', 'Coach'];

// Removes every team from a room. The remaining overwrites are written to the category and both channels
// at once (3 calls, in parallel) instead of deleting team overwrites one by one and then re-syncing.
var empty = async function (room) {
	// refresh first, so a team added moments ago (whose update event hasn't arrived yet) is still removed
	await room.fetch(true);
	var overwrites = [...room.permissionOverwrites.cache.values()].filter(function (overwrite) {
		var role = overwrite.type === OverwriteType.Role ? room.guild.roles.cache.get(overwrite.id) : null;
		return role && ROOM_KEPT_ROLE_NAMES.includes(role.name);
	}).map(overwrite => ({ id: overwrite.id, type: overwrite.type, allow: overwrite.allow, deny: overwrite.deny }));
	// The text channel gets exactly the category's overwrites, so it stays synced; the voice channel gets
	// them with its built-in chat turned off (see disableVoiceChannelChatInCategory).
	// allSettled, not all: if one write fails, wait for the others before returning, or the next queued
	// command could start while they're still changing this room
	var results = await Promise.allSettled([room.permissionOverwrites.set(overwrites)].concat([...room.children.cache.values()].map(channel =>
		channel.permissionOverwrites.set(channel.type === ChannelType.GuildVoice ? overwrites.map(withVoiceChatDenied) : overwrites))));
	var failure = results.find(result => result.status === 'rejected');
	if (failure) {
		throw failure.reason;
	}
}

// Permissions for a competition room's category: hidden from everyone except Staff and Spectators.
// Teams are added later with .a.
var competitionRoomOverwrites = function (guild) {
	var staffRole = guild.roles.cache.find(r => r.name === 'Staff');
	var spectatorRole = guild.roles.cache.find(r => r.name === 'Spectator');
	if (!staffRole || !spectatorRole) {
		throw new Error('The Staff or Spectator role is missing');
	}
	return [
		{ id: guild.roles.everyone.id, type: OverwriteType.Role, deny: [PermissionFlagsBits.ViewChannel] },
		{ id: staffRole.id, type: OverwriteType.Role, allow: [PermissionFlagsBits.ViewChannel] },
		{ id: spectatorRole.id, type: OverwriteType.Role, allow: [PermissionFlagsBits.ViewChannel] }
	];
}

// Creates a category with <name>-text and <name>-voice, and returns the text channel.
// The permissions are set as each channel is created rather than edited afterwards, which takes 3 API calls
// instead of about 7. The text channel gets the category's overwrites, so it counts as synced; the voice
// channel gets them with its built-in chat turned off (see disableVoiceChannelChatInCategory).
// If any step fails, the channels already made are deleted (see rollBack) before the error is rethrown.
var createRoom = async function (guild, name, overwrites = competitionRoomOverwrites(guild)) {
	var made = [];
	try {
		var category = await guild.channels.create({name: name, type: ChannelType.GuildCategory, permissionOverwrites: overwrites});
		made.push(category);
		var cleanName = name.replace(/\s+/g, '-').toLowerCase();
		var text = await guild.channels.create({name: cleanName + '-text', parent: category, permissionOverwrites: overwrites});
		made.push(text);
		made.push(await guild.channels.create({name: cleanName + '-voice', parent: category, type: ChannelType.GuildVoice,
																					permissionOverwrites: overwrites.map(withVoiceChatDenied)}));
		return text;
	} catch (error) {
		await rollBack(error, made);
		throw error;
	}
}

// Deletes the channels or roles a failed create made, newest first (so a category's channels go before the
// category; deleting a category alone leaves its channels behind). Whatever can't be deleted is added to
// error.leftovers as a description like 'channel "a-text"', for the caller to report with leftoversMessage.
var rollBack = async function (error, made) {
	error.leftovers = error.leftovers ?? [];
	for (var thing of [...made].reverse()) {
		var label = (thing instanceof Role ? 'role' : 'channel') + ' "' + thing.name + '"';
		try {
			await thing.delete();
		} catch (deleteError) {
			console.error('Could not clean up ' + label + ':', deleteError.message ?? deleteError);
			error.leftovers.push(label);
		}
	}
}

// For a batch that had failures: a sentence naming the partly built roles and channels that couldn't be
// cleaned up, or '' if there were none. Retrying a name is rejected while its leftovers still exist.
var leftoversMessage = function (leftovers) {
	if (leftovers.length === 0) {
		return '';
	}
	return '\nThese partly built pieces could not be cleaned up; please delete them by hand before retrying: ' +
		listNamesForMessage(leftovers, 'roles and channels') + '.';
}

var deleteRoom = async function (text) {
  var category = text.parent;
  var name = category.name;
  for (var [flake, channel] of category.children.cache) {
		await channel.delete();
  }
  await category.delete();
  return name;
}

// How often init posts "deleted X of Y" updates while it clears out the server
const INIT_PROGRESS_INTERVAL_MS = 5000;
// How many old channels init deletes at once. Each channel has its own rate limit, but Discord also caps
// total requests per second, and may have limits it doesn't announce (see addTeamsToHub).
const INIT_DELETE_CONCURRENCY = 5;

var init = async function (guild, commandChannel) {
  // basic setup of the tournament server

	// Progress goes to the channel the command came from for as long as that channel exists.
	// It's deleted last, and the final result is posted in the new #bot-commands.
	var say = async function (text) {
		if (commandChannel && guild.channels.cache.has(commandChannel.id)) {
			await commandChannel.send(text).catch(console.error);
		}
	};
	var lastProgress = Date.now();
	var progress = async function (text) {
		if (Date.now() - lastProgress >= INIT_PROGRESS_INTERVAL_MS) {
			lastProgress = Date.now();
			await say(text);
		}
	};

  await guild.setDefaultMessageNotifications(GuildDefaultMessageNotifications.OnlyMentions);

	// empty out existing roles so the correct ones can take their place.
	// Managed roles (bots, Server Booster) can't be deleted, so don't try.
	var keptRoleNames = ['CKB Bot', 'ckbbot', 'Server Booster', 'Test CKB Bot Local'];
	var rolesToDelete = [...guild.roles.cache.values()].filter(role =>
		role.id !== guild.id && !role.managed && !keptRoleNames.includes(role.name));
	var channelsToDelete = [...guild.channels.cache.values()];
	channelsToDelete.sort((a, b) => (a.id === commandChannel?.id) - (b.id === commandChannel?.id));

	await say('Initializing the server: deleting ' + rolesToDelete.length + ' roles and ' + channelsToDelete.length +
						' channels, then building the tournament layout. On a big server this can take several minutes; ' +
						'progress will be posted here until this channel is deleted.');

	// Roles and channels are deleted at the same time, since they don't depend on each other.
	// Role deletes share one rate limit for the whole server, so they go one at a time. Each channel has
	// its own rate limit, so several channels are deleted at once. The command channel goes last, so
	// progress can be posted there until the end.
	var rolesDeleted = 0;
	var rolesFailed = 0;
	var channelsDeleted = 0;
	var channelsFailed = 0;
	var deleteProgress = function () {
		return 'Deleted ' + rolesDeleted + ' of ' + rolesToDelete.length + ' roles and ' +
			channelsDeleted + ' of ' + channelsToDelete.length + ' channels';
	};

	var deleteRoles = async function () {
		for (var role of rolesToDelete) {
			try {
				await role.delete();
				rolesDeleted++;
			} catch (e) {
				rolesFailed++;
				console.error('could not delete role: ' + role.name);
				console.error(e);
			}
			await progress(deleteProgress() + ' . . .');
		}
	};

	var deleteChannel = async function (channel) {
		// Some channels can't be deleted (e.g. a Community server's rules/updates channels);
		// skip them instead of aborting init with the roles already gone.
		try {
			await channel.delete();
			channelsDeleted++;
		} catch (e) {
			channelsFailed++;
			console.error('could not delete channel: ' + channel.name);
			console.error(e);
		}
		await progress(deleteProgress() + ' . . .');
	};

	var otherChannels = channelsToDelete.filter(channel => channel.id !== commandChannel?.id);
	await Promise.all([
		deleteRoles(),
		runWithConcurrency(otherChannels, INIT_DELETE_CONCURRENCY, deleteChannel)
	]);
	if (otherChannels.length < channelsToDelete.length) {
		await say(deleteProgress() + '. Deleting this channel now; the result will be posted in the new #bot-commands.');
		await deleteChannel(commandChannel);
	}
	await say('Building the tournament roles and channels . . .');
	const basePermissions = [PermissionFlagsBits.ChangeNickname,
													 PermissionFlagsBits.ViewChannel,
													 PermissionFlagsBits.SendMessages,
													 PermissionFlagsBits.ReadMessageHistory,
													 PermissionFlagsBits.AddReactions,
													 PermissionFlagsBits.Connect,
													 PermissionFlagsBits.Speak,
													 PermissionFlagsBits.UseVAD];
	const  staffPermissions = [].concat(basePermissions,
																			[PermissionFlagsBits.Stream,
																			 PermissionFlagsBits.ManageMessages,
																			 PermissionFlagsBits.EmbedLinks,
																			 PermissionFlagsBits.AttachFiles,
																			 PermissionFlagsBits.MentionEveryone,
																			 PermissionFlagsBits.MuteMembers,
																			 PermissionFlagsBits.ManageNicknames,
																			 PermissionFlagsBits.MoveMembers]);
	const coachPermissions = staffPermissions;
	await guild.roles.everyone.setPermissions(basePermissions);
  var controlRoomRole = await guild.roles.create({
	  name: 'Control Room',
	  colors: { primaryColor: Colors.Purple },
	  hoist: true,
	  permissions: PermissionFlagsBits.Administrator,
	  mentionable: true,
	  position: 1
  });
  var staffRole = await guild.roles.create({
	  name: 'Staff',
	  colors: { primaryColor: Colors.Blue },
	  hoist: true,
		permissions: staffPermissions,
	  mentionable: true,
	  position: 1
  });
  var spectatorRole = await guild.roles.create({
	  name: 'Spectator',
	  colors: { primaryColor: Colors.DarkGrey },
	  hoist: true,
	  mentionable: true,
	  position: 1
  });
  var coachRole = await guild.roles.create({
	  name: 'Coach',
	  colors: { primaryColor: 0x546E7A }, // same as bottom right role color
	  hoist: true,
		permissions: coachPermissions,
	  mentionable: true,
	  position: 1
  });
	var controlRoomCategory = await guild.channels.create({name: 'Control Room',
																												 type: ChannelType.GuildCategory});
  await controlRoomCategory.permissionOverwrites.edit(guild.roles.everyone, {
		ViewChannel: false
  });
  await controlRoomCategory.permissionOverwrites.edit(staffRole, {
		ViewChannel: true
  });
  var linksChannel = await guild.channels.create({name: 'announcements-and-links', parent: controlRoomCategory});
  await linksChannel.permissionOverwrites.edit(staffRole, {
		SendMessages: false
  });
  /*
    var packetsChannel = await guild.channels.create('packets', {parent: controlRoomCategory});
    await packetsScoresheetsChannel.updateOverwrite(staffRole, {
    'SEND_MESSAGES': false
    });
  */
  var protestsChannel = await guild.channels.create({name: 'protests', parent: controlRoomCategory});
  var botCommandsChannel = await guild.channels.create({name: 'bot-commands', parent: controlRoomCategory});
  var controlRoomChannel = await guild.channels.create({name: 'control-room', parent: controlRoomCategory});
  var controlRoomVoiceChannel = await guild.channels.create({name: 'control-room-voice', parent: controlRoomCategory, type: ChannelType.GuildVoice});
	await controlRoomChannel.permissionOverwrites.edit(staffRole, {
		ViewChannel: false
	});
	await controlRoomVoiceChannel.permissionOverwrites.edit(staffRole, {
		ViewChannel: false
	});
  var readerRoomChannel = await guild.channels.create({name: 'reader-room', parent: controlRoomCategory});
  var readerRoomVoiceChannel = await guild.channels.create({name: 'reader-room-voice', parent: controlRoomCategory, type: ChannelType.GuildVoice});
  var readerRoomVoice2Channel = await guild.channels.create({name: 'reader-room-voice-2', parent: controlRoomCategory, type: ChannelType.GuildVoice});
	await disableVoiceChannelChatInCategory(controlRoomCategory);


	//Hub is where students get announcements and interact with each other
	var hubCategory = await guild.channels.create({name: 'Hub',
																								 type: ChannelType.GuildCategory});
  await hubCategory.permissionOverwrites.edit(guild.roles.everyone, {
		ViewChannel: false
  });
  await hubCategory.permissionOverwrites.edit(staffRole, {
		ViewChannel: true
  });
  await hubCategory.permissionOverwrites.edit(spectatorRole, {
		ViewChannel: true
  });
  await hubCategory.permissionOverwrites.edit(coachRole, {
		ViewChannel: true
  });

	//announcements channel won't be synced with hub category
	//  so that @everyone can read it (but not write)
  //control room has implicit permissions to post in announcements
  var announcementsChannel = await guild.channels.create({name: 'announcements', parent: hubCategory});
  await announcementsChannel.permissionOverwrites.edit(guild.roles.everyone, {
		ViewChannel: true,
		SendMessages: false,
		ReadMessageHistory: true,
		AddReactions: false
  });
  await announcementsChannel.send(guild.name + ' is committed to ensuring that Knowledge Bowl is safe, open, and welcoming for everyone. If anyone at this tournament makes you feel unsafe or unwelcome, please do not hesitate to reach out to anyone with the ' + controlRoomRole.toString() + ' or ' + staffRole.toString() + ' roles.');

	//general channel won't be synced with hub category
	//  so that @everyone can read and write it
	var generalChannel = await guild.channels.create({name: 'general', parent: hubCategory});
	await generalChannel.permissionOverwrites.edit(guild.roles.everyone, {
		SendMessages: true,
		ViewChannel: true,
		AddReactions: false
  });
	await generalChannel.setRateLimitPerUser(3);


  var hallwayVoiceChannel = await guild.channels.create({name: 'hallway-voice', parent: hubCategory, type: ChannelType.GuildVoice});
	//make some lounge channels for people to talk to each other
	var loungeChannel = await guild.channels.create({name: 'lounge-text', parent: hubCategory});
	await loungeChannel.setRateLimitPerUser(10);
	var loungeVoiceChannel1 = await guild.channels.create({name: 'lounge-voice-1', parent: hubCategory, type: ChannelType.GuildVoice});
	var loungeVoiceChannel2 = await guild.channels.create({name: 'lounge-voice-2', parent: hubCategory, type: ChannelType.GuildVoice});
	var loungeVoiceChannel3 = await guild.channels.create({name: 'lounge-voice-3', parent: hubCategory, type: ChannelType.GuildVoice});
	var loungeVoiceChannel4 = await guild.channels.create({name: 'lounge-voice-4', parent: hubCategory, type: ChannelType.GuildVoice});
	//Voice channels won't be synced, either, so that I can
	// disable the text chat on them.  So they'll be regularly synced,
	// then disabled over and over and over because . . . Discord.
	await disableVoiceChannelChatInCategory(hubCategory);


	//Make a lounge for coaches to talk to each other
	var coachesLoungeCategory = await guild.channels.create({name: 'Coaches Lounge', type: ChannelType.GuildCategory});
	await coachesLoungeCategory.permissionOverwrites.edit(guild.roles.everyone, {
		ViewChannel: false
	});
	await coachesLoungeCategory.permissionOverwrites.edit(staffRole, {
		ViewChannel: true
	});
	await coachesLoungeCategory.permissionOverwrites.edit(coachRole, {
		ViewChannel: true
	});
	var coachChannel = await guild.channels.create({name: 'coaches-text', parent: coachesLoungeCategory});
	var coachVoiceChannel1 = await guild.channels.create({name: 'coaches-voice-1', parent: coachesLoungeCategory, type: ChannelType.GuildVoice});
	var coachVoiceChannel2 = await guild.channels.create({name: 'coaches-voice-2', parent: coachesLoungeCategory, type: ChannelType.GuildVoice});
	var coachVoiceChannel3 = await guild.channels.create({name: 'coaches-voice-3', parent: coachesLoungeCategory, type: ChannelType.GuildVoice});
	await disableVoiceChannelChatInCategory(coachesLoungeCategory);


  await (await guild.fetchOwner()).roles.add(controlRoomRole);
  await guild.setDefaultMessageNotifications(GuildDefaultMessageNotifications.OnlyMentions);
  await guild.setSystemChannel(generalChannel);

	var doneMessage = 'Server initialization is complete.';
	if (rolesFailed || channelsFailed) {
		doneMessage += ' ' + rolesFailed + ' old role(s) and ' + channelsFailed +
			' old channel(s) could not be deleted; check the bot console and remove them by hand if needed.';
	}
	await botCommandsChannel.send(doneMessage).catch(console.error);
	await say(doneMessage); // only if the original channel survived (it couldn't be deleted)
}

var help = function (channel, sections) {
	//console.log("In help function");
  sections = sections || ['i', 'g', 'u', 'c', 'd', 'b', 'n', 'a', 'r', 't', 'e', 'p', 'w', 'l', 'o', 'h'];
  var helpMessage = {
		color: 0x29bb9c, // same as discord aqua
		title: 'CKB Bot Help',
		description: 'This bot is able to perform initial server setup, create and delete rooms, and add, remove, or transfer teams to and from rooms. It supports both conventional bot-style syntax and natural language-style [NL-style] syntax. Commands acting on existing teams or rooms require you to tag the role of the team you are operating on and/or the text channels representing the rooms you are operating on. Unless otherwise stated, commands can only be run by users with the Control Room or Staff roles. **Multiple commands can be stacked in one message, as long as they are separated by newlines. Add --force to the end of your command to override having to confirm.**',
		fields: []
  };
  for (var section of sections) {
		var helpSectionOrig = helpSections[section];
		var helpSection = {
			name: helpSectionOrig.name,
			value: helpSectionOrig.value
		};
		helpSection.value = helpSection.value.replace(/\%ServerName\%/g, channel.guild.name)
		helpMessage.fields.push(helpSection);
  }
  if (sections.length < 9) {
		helpMessage.description = '';
  }
  channel.send({embeds: [helpMessage]});
}

/*var schedule = async function (guild, docID, sheetIndex) {
  var doc = new GoogleSpreadsheet(docID);
  await doc.useApiKey(config.apiKey);
  await doc.loadInfo();
  var sheet = doc.sheetsByIndex[sheetIndex];
  await sheet.loadCells('a1:z26'); // up to 12 rooms and 24 rounds
  var rooms = {}; // key is column index from 0, value is room name
  for (var i = 1; i < 26; i++) { // cols B to Z
	var val = sheet.getCell(0, i).value;
	if (val) {
	rooms[i] = {};
	rooms[i]['name'] = val;
	rooms[i]['teamsByRound'] = {};
	}
  }
  var rounds = {inOrder: []};
  var teams = {};
  for (var i = 1; i < 26; i++) {
	roundName = sheet.getCell(i, 0).value;
	if (!roundName) {
	continue;
	} else {
	rounds[i] = roundName;
	rounds.inOrder.push(i);
	}
	for (var j = 1; j < 26; j++) {
	var roomName = sheet.getCell(0, j).value;
	if (!roomName) {
	continue;
	}
	var val1 = sheet.getCell(i, j).value;
	var val2 = sheet.getCell(i, j + 1).value;
	if (rooms[j] && val1 && val2) {
	rooms[j].teamsByRound[i] = [val1, val2];
	} else if (rooms[j] && val1) {
	rooms[j].teamsByRound[i] = [val1];
	} else {
	break;
	}
	if (teams[val1]) {
	teams[val1].roomsByRound[i] = j;
	} else {
	teams[val1] = {
	roomsByRound: {}
	};
	teams[val1].roomsByRound[i] = j;
	}
	if (teams[val2] && val2) {
	teams[val2].roomsByRound[i] = j;
	} else if (val2) {
	teams[val2] = {
	roomsByRound: {}
	};
	teams[val2].roomsByRound[i] = j;
	} // check if val2 exists because there may be byes
	}
  }
  console.log(rounds);
  for (var team in teams) {
	for (var role of guild.roles.cache.values()) {
	if (team === role.name) {
	teams[team].role = role;
	break;
	}
	}
  }
  for (var room in rooms) {
	for (var channel of guild.channels.cache.values()) {
	if (channel.name === rooms[room].name && channel.type === 'category') {
	for (var child of channel.children.values()) {
	if (child.type === 'text') {
	rooms[room].channel = child;
	break;
	}
	}
	break;
	}
	}
  }
  for (var room in rooms) {
	if (!rooms[room].channel) {
	continue;
	}
	var roomSchedule = {
	color: '#29bb9c', // same as discord aqua
	title: 'Schedule for Room "' + rooms[room].name + '"',
	description: 'Run the commands listed here before/after each round to move teams to the correct room. You can simply copy/paste the commands from this schedule.',
	fields: []
	};
	var i = 0;
	for (var round in rooms[room].teamsByRound) {
	var t1 = teams[rooms[room].teamsByRound[round][0]];
	var t2 = teams[rooms[room].teamsByRound[round][1]];
	if (!t2) {
	break;
	}
	if (i === 0) {
	roomSchedule.fields.push({
	name: 'Before ' + rounds[round],
	value: '.a ' + t1.role.toString() + ' ' + rooms[room].channel.toString() + '\n.a ' + t2.role.toString() + ' ' + rooms[room].channel.toString()
	});
	}
	var nextRound = String(Number(round) + 1);
	try {
	var nextRound = rounds.inOrder[rounds.inOrder.indexOf(Number(round)) + 1];
	} catch (e) {} // last round
	var nextRoom1 = Number(t1.roomsByRound[nextRound]);
	var nextRoom2 = Number(t2.roomsByRound[nextRound]);
	var fieldValue = '';
	if (nextRoom1 && rooms[nextRoom1].channel) {
	fieldValue += '.t ' + t1.role.toString() + ' ' + rooms[room].channel.toString() + ' ' + rooms[nextRoom1].channel.toString();
	} else {
	fieldValue += '.r ' + t1.role.toString() + ' ' + rooms[room].channel.toString();
	}
	if (nextRoom2 && rooms[nextRoom2].channel) {
	fieldValue += '\n.t ' + t2.role.toString() + ' ' + rooms[room].channel.toString() + ' ' + rooms[nextRoom2].channel.toString();
	} else {
	fieldValue += '\n.r ' + t2.role.toString() + ' ' + rooms[room].channel.toString();
	}
	roomSchedule.fields.push({
	name: 'After ' + rounds[round],
	value: fieldValue
	});
	i++;
	}
	rooms[room].channel.send({embed: roomSchedule}).then(function (message) {
	message.pin();
	return;
	});
  }
  return;
	}
*/

//all in range [0,1]
var hsvToRgb = function (h, s, v) {
	function f(x, h, s, v) {
		var k = (x + (h*360)/60) % 6;
		return v - v * s * Math.max(0, Math.min(k, 4-k, 1))
	}
	return [Math.floor(Math.max(Math.min(f(5, h, s, v) * 256, 255), 0)),
					Math.floor(Math.max(Math.min(f(3, h, s, v) * 256, 255), 0)),
					Math.floor(Math.max(Math.min(f(1, h, s, v) * 256, 255), 0))];
}

//all in range [0,1]
var hsvToRgb2 = function (h, s, v) {
	var r, g, b, i, f, p, q, t;
	i = Math.floor(h*6);
	f = h * 6 - i;
	p = v * (1 - s);
	q = v * (1 - f * s);
	t = v * (1 - (1 - f) * s);
	switch (i % 6) {
	case 0: r = v, g = t, b = p; break;
	case 1: r = q, g = v, b = p; break;
  case 2: r = p, g = v, b = t; break;
  case 3: r = p, g = q, b = v; break;
  case 4: r = t, g = p, b = v; break;
  case 5: r = v, g = p, b = q; break;
  }
	return [Math.round(r * 255),
					Math.round(g * 255),
					Math.round(b * 255)];

}

var randomColor = function() {
	//Make a color in hsl and convert to rgb
	//Maintain a minimum brightness and avoid colors with hues
	//  between 240 and 0, since those are for staff/admin
	var h = Math.random() * 240 / 360;
	var s = Math.random()*0.6 + 0.3;
	var v = Math.random()*0.25 + 0.75;
	var color = hsvToRgb2(h, s, v);
	return color;
}

// Gives team roles access to the Hub category, in one API call however many teams there are.
// Editing one channel's overwrites a role at a time runs into a Discord limit that discord.js can't
// see coming (42 teams got six 429s and about 24 seconds of waiting), so this rewrites the whole list.
// Follow with syncHubChannels so the Hub's channels pick up the change.
// A role that already has a Hub overwrite keeps it (lockdown edits it), so this is safe to run again on
// teams from an earlier .n.
var addTeamsToHub = async function(guild, roles) {
	if (roles.length === 0) {
		return;
	}
	var generalChannel = guild.channels.cache.find(channel => channel.name === "general");
	var hubCategory = generalChannel.parent;
	// The cache can be stale (see lockPerms), and set() replaces everything, so start from Discord's copy
	await hubCategory.fetch(true);
	var missing = roles.filter(role => !hubCategory.permissionOverwrites.cache.has(role.id));
	if (missing.length === 0) {
		return;
	}
	var overwrites = [...hubCategory.permissionOverwrites.cache.values()]
		.map(overwrite => ({ id: overwrite.id, type: overwrite.type, allow: overwrite.allow, deny: overwrite.deny }));
	for (var role of missing) {
		overwrites.push({ id: role.id, type: OverwriteType.Role, allow: [
			PermissionFlagsBits.ViewChannel,
			PermissionFlagsBits.SendMessages,
			PermissionFlagsBits.Connect,
			PermissionFlagsBits.AddReactions,
			PermissionFlagsBits.ReadMessageHistory,
			PermissionFlagsBits.Speak
		] });
	}
	await hubCategory.permissionOverwrites.set(overwrites);

	//Announcements isn't synced with the hub category, so we need to add visibility
	//announcementsChannel.updateOverwrite(role);
}

var lockdownOverwrite = async function(guild, hubCategory, coachPos, overwrite) {
	var role = await guild.roles.fetch(overwrite.id);
	if(coachPos < 0) {
		throw 'Coach role deleted';
	}
	if(role.position < coachPos && role.name !== '@everyone') {
		await hubCategory.permissionOverwrites.edit(role, {
			ViewChannel: true,
			SendMessages: false,
			Connect: true,
			AddReactions: false,
			ReadMessageHistory: true,
			Speak: false
		});
	}
	return Promise.resolve("Success");
}

var allowSpeakOverwrite = async function(guild, hallwayChannel, coachPos, overwrite) {
	var role = await guild.roles.fetch(overwrite.id);
	if(coachPos < 0) {
		throw 'Coach role deleted';
	}
	if(role.position < coachPos && role.name !== '@everyone') {
		await hallwayChannel.permissionOverwrites.edit(role, {
			ViewChannel: true,
			SendMessages: false,
			Connect: true,
			AddReactions: false,
			ReadMessageHistory: true,
			Speak: true
		});
	}
	return Promise.resolve("Success");
}

var moveChannelAndSync = async function(destinationCategory, channel) {
	// setParent's own permission sync reads the destination's cache, which can be stale (e.g. a
	// just-created Lockdown Lounge with no overwrites yet, which would leave the lounge visible to
	// everyone). Keep the current permissions while moving and let lockPerms sync from fresh data.
	await channel.setParent(destinationCategory, { lockPermissions: false });
	await lockPerms(channel);
	return Promise.resolve("Success");
}

var lockdownLounge = async function(guild, message) {
	var generalChannel = await guild.channels.cache.find(channel => channel.name === "general");
	var hubCategory = generalChannel.parent;
	var lockdownCategory = await guild.channels.cache.find(channel => channel.name === "Lockdown Lounge");
	if(!lockdownCategory) {
		lockdownCategory = await guild.channels.create({name: 'Lockdown Lounge',
																										type: ChannelType.GuildCategory});
		// await so the channels moved in below copy this deny, not an empty overwrite list
		await lockdownCategory.permissionOverwrites.edit(guild.roles.everyone, {
			ViewChannel: false
		});
	}

	//var pos = await coachPosition(guild);


	//Move all lounge channels to the lockdown lounge and sync permissions there
	var promises = Array();
	for(var [flake, channel] of hubCategory.children.cache) {
		if(channel.name.match(/lounge/)) {
			promises.push(moveChannelAndSync(lockdownCategory, channel));
		}
	}
	await Promise.all(promises);

	//First modify hub, which changes all sync'd channels, which is just the lounge text
	//{
		//var overwrites = hubCategory.permissionOverwrites.cache;
		//var promises = Array();
		//for (var [flake, overwrite] of overwrites) {
			//promises.push(lockdownOverwrite(guild, hubCategory, pos, overwrite));
		//}
		//await Promise.all(promises);
	//}

	//Previously, hallway voice was sync'd with hub
	//Now, it's not, so I don't have to do anything.
	//{
		//Now modify hallway-voice to unsync and allow speaking
		//var hallwayChannel = await guild.channels.cache.find(channel => channel.name === "hallway-voice");
		//var overwrites = hallwayChannel.permissionOverwrites.cache;
		//var promises = Array();
		//for (var [flake, overwrite] of overwrites) {
			//promises.push(allowSpeakOverwrite(guild, hallwayChannel, pos, overwrite));
		//}
		//await Promise.all(promises);
	//}
}

var allowHubSpeakOverwrite = async function(guild, hubCategory, coachPos, overwrite) {
	var role = await guild.roles.fetch(overwrite.id);
	if(coachPos < 0) {
		throw 'Coach role deleted';
	}
	if(role.position < coachPos && role.name !== '@everyone') {
		await hubCategory.permissionOverwrites.edit(role, {
			ViewChannel: true,
			SendMessages: true,
			Connect: true,
			AddReactions: true,
			ReadMessageHistory: true,
			Speak: true
		});
	}
	return Promise.resolve("Success");
}

var unlockLounge = async function(guild, message) {
	var generalChannel = await guild.channels.cache.find(channel => channel.name === "general");
	var hubCategory = generalChannel.parent;
	var lockdownCategory = await guild.channels.cache.find(channel => channel.name === "Lockdown Lounge");
	//var pos = await coachPosition(guild);

	if(!lockdownCategory) {
		message.channel.send("Cannot find \"Lockdown Lounge\" category to restore.")
		return;
	}

	//move all lounge channels back to hub
	//then sync with hub and remodify voice chat permissions
	message.channel.send("--Moving lounge channels back to Hub . . .");
	var promises = Array();
	for(var [flake, channel] of lockdownCategory.children.cache) {
		if(channel.name.match(/lounge/)) {
			promises.push(moveChannelAndSync(hubCategory, channel));
		}
	}
	await Promise.all(promises);
	message.channel.send("--Removing voice channel chat permissions in hub . . .");
	await disableVoiceChannelChatInCategory(hubCategory);

	// Only delete the category if it's empty; anything left in it would lose its category
	if (lockdownCategory.children.cache.size === 0) {
		try {
			await lockdownCategory.delete();
		} catch (e) {
			console.error(e);
			message.channel.send('The lounge channels are back in Hub, but the "Lockdown Lounge" category could not be deleted. Please delete it manually.');
		}
	} else {
		message.channel.send('The lounge channels are back in Hub. "Lockdown Lounge" still has other channels in it, so it was not deleted.');
	}

	//First unmodify hub
	//{
		//var overwrites = hubCategory.permissionOverwrites.cache;
		//var promises = Array();
		//for (var [flake, overwrite] of overwrites) {
			//promises.push(allowHubSpeakOverwrite(guild, hubCategory, pos, overwrite));
		//}
		//await Promise.all(promises);
	//}

	//sync hallway-voice with hub
	//var hallwayChannel = await guild.channels.cache.find(channel => channel.name === "hallway-voice");
	//await lockPerms(hallwayChannel);
}

// Creates a team role and its private lounge, and returns the role.
// The caller must then give the new roles Hub access with addTeamsToHub, and run syncHubChannels.
var createTeam = async function (guild, name) {
	var teamRole = await guild.roles.create({
		name: name,
		colors: { primaryColor: randomColor() },
		hoist: true,
		mentionable: true
	});
	// Same permissions .a gives a team, except that teams can read their own lounge's history.
	// createRoom cleans up its own channels if it fails; the role is deleted here so the name can be retried.
	// (A deleted role still counts toward Discord's role-creation limit.)
	try {
		await createTeamLounge(guild, name, teamRole);
	} catch (error) {
		await rollBack(error, [teamRole]);
		throw error;
	}
	return teamRole;
}

var createTeamLounge = function (guild, name, teamRole) {
	return createRoom(guild, name + ' Lounge', [
		{ id: guild.roles.everyone.id, type: OverwriteType.Role, deny: [PermissionFlagsBits.ViewChannel] },
		{ id: teamRole.id, type: OverwriteType.Role, allow: [
			PermissionFlagsBits.ViewChannel,
			PermissionFlagsBits.SendMessages,
			PermissionFlagsBits.Connect,
			PermissionFlagsBits.AddReactions,
			PermissionFlagsBits.ReadMessageHistory,
			PermissionFlagsBits.Speak
		] }
	]);
}

// How many teams .n builds at once. Discord handles one channel creation at a time per server anyway, so
// more than a few just lines up more requests behind the same queue.
const TEAM_CREATION_CONCURRENCY = 4;

// Runs worker(item) for every item, at most `limit` at a time, starting them in order.
var runWithConcurrency = async function (items, limit, worker) {
	var next = 0;
	var runners = [];
	for (var r = 0; r < Math.min(limit, items.length); r++) {
		runners.push((async function () {
			while (next < items.length) {
				var item = items[next++];
				await worker(item);
			}
		})());
	}
	await Promise.all(runners);
}

var massCreateTeams = async function (guild, prefix, startIndex, endIndex) {
	var roles = [];
  for (var i = startIndex; i <= endIndex; i++) {
		var name = prefix + String(i);
		roles.push(await createTeam(guild, name));
  }
	await addTeamsToHub(guild, roles);
	//sync all voice channels with category, then
	// disable the chat channel in the voice channels
	//I don't see a better way to do this.  I wish
	// I could just disable voice channel chat.
	var generalChannel = guild.channels.cache.find(channel => channel.name === "general");
	await syncHubChannels(generalChannel.parent);

  return;
}

var setGuildBitrate = async function (bitrate, guild) {
  for (var channel of guild.channels.cache.values()) {
		if (channel.type === ChannelType.GuildVoice) {
	    await channel.setBitrate(bitrate * 1000);
			//	    console.log('set bitrate for ' + channel.name);
		}
  }
  return;
}

// Runs a confirm callback and reports any failure in the channel. Callers don't await
// confirm(), so without this an error in an async callback would only reach the console.
var runConfirmCallback = async function (message, callback) {
	try {
		await callback();
	} catch (e) {
		console.error(e);
		message.channel.send(rateLimitMessage(e) ?? 'Something went wrong while running that command; check the bot console for details.').catch(console.error);
	}
}

var confirm = async function (message, prompt, force, failCallback, successCallback) {
	try {
		if (force) {
			message.react('👍').catch(console.error);
			await runConfirmCallback(message, successCallback);
			return;
		}

		var msg = await message.channel.send(prompt);
		msg.react('👍').catch(console.error);
		const filter = (reaction, user) => reaction.emoji.name === '👍' && user.id === message.author.id;
		var collected = await msg.awaitReactions({ filter, time: 6000 });
		if (collected.size === 0) {
			await runConfirmCallback(message, failCallback);
		} else {
			await runConfirmCallback(message, successCallback);
		}
	} catch (e) {
		// sending the prompt or waiting for reactions failed
		console.error(e);
		message.channel.send('Could not ask for confirmation, so the command was not run.').catch(console.error);
	}
}

// .w (secret code for the written) can be run by anyone, but only in a lounge
// Each command's short name and its natural-language alias (see helpSections), mapped to the short name
const COMMAND_NAMES = {
	a: 'a', add: 'a',
	r: 'r', remove: 'r',
	t: 't', transfer: 't',
	e: 'e', empty: 'e',
	i: 'i', 'initialize-server': 'i',
	c: 'c', create: 'c',
	p: 'p', paint: 'p',
	d: 'd', delete: 'd',
	n: 'n', 'new-teams': 'n',
	g: 'g', 'grant-control-room': 'g',
	u: 'u', 'ungrant-control-room': 'u',
	l: 'l', 'lockdown-lounge': 'l',
	o: 'o', 'open-lounge': 'o',
	w: 'w', 'written-code': 'w',
	h: 'h', help: 'h',
	// undocumented: z writes the member update log (bot owner only), k logs Hub permissions
	z: 'z', k: 'k',
};

// Returns the short name of the command a line starts with, or null. The whole word must match, so `.done`
// isn't `.d` and `.e.g.` isn't `.e`. Mentions and quotes can follow without a space (`.a<@&123>`).
var commandName = function (line) {
	var match = line.match(/^\.([a-z]+(?:-[a-z]+)*)(?![a-z0-9.\-])/i);
	return match ? COMMAND_NAMES[match[1].toLowerCase()] ?? null : null;
}

var isWrittenCodeCommand = function (command, message) {
	return commandName(command) === 'w' && message.channel.name.indexOf("lounge") > -1;
}

// Every other command needs Control Room, Staff, or the server owner
var isStaffCommand = function (command, message) {
	return !isWrittenCodeCommand(command, message) && /^\.[a-z]/i.test(command) &&
		(hasRole(message.member, 'Control Room') || hasRole(message.member, 'Staff') || message.author.id === message.guild.ownerId);
}

var processCommand = async function (command, message) {

	//console.log("In processCommand, processing the command " + command);
	//These are commands that can be run by anyone
	if (isWrittenCodeCommand(command, message)) {
		//Give them a secret code for their written
		var id1 = message.channel.id.padStart(10, 1);
		var id2 = message.guild.id.padStart(10, 1);
		var val1 = parseInt(id1.substring(id1.length-4, id1.length));
		var val2 = parseInt(id2.substring(id2.length-4, id2.length));


		//message.channel.send('Channel ID:' + id1);
		//message.channel.send('Guild ID:' + id2);
		//message.channel.send('val1: ' + val1);
		//message.channel.send('val2: ' + val2);


		var date1 = new Date("01/01/2000");
		var today = new Date();
		var difference_in_time = today.getTime() - date1.getTime();
		var val3 = parseInt(difference_in_time / (1000*3600*24));
		//message.channel.send('Today num: ' + val3);

		var mult = val1 * val2 * val3;

		//message.channel.send('Mult: ' + mult);

		var code = mult.toString().padStart(10, 0);
		code = code.substring(code.length-6, code.length-2)

		var channelName = message.channel.name;

		// Team lounges are named "<team>-lounge-text"; the public "lounge-text" has no team name
		var loungeIndex = channelName.indexOf("-lounge");
		var greeting = loungeIndex > 0 ? 'Hello ' + channelName.substring(0, loungeIndex) + '!' : 'Hello!';

		message.channel.send(greeting + " Your secret code for today's written is " + code);

	} else if (isStaffCommand(command, message)) {

		//console.log("Is Control Room or Staff");

		// var force = command.indexOf('--force') >= 0 ? 1 : 0;
		var force = false;
		var forceIndex = command.indexOf('--force');
		if (forceIndex > -1) {
			force = true;
			command = command.replace('--force', '');
		}


		//If we're here, we know that the caller is Control Room, Staff, or owner, so if all of those can
		//  call a command, we don't have to bother checking roles
		var cmd = commandName(command);
		var mentions = await getMentions(command, message.guild);
		if (cmd === 'a') {
			try {
				var roles = mentions.roles;
				var channels = mentions.channels;
				if(channels.length == 0) {
					throw 'No channel specified';
				}
				var to = channels[0].parent;
				if(to.name == "Control Room" || to.name == "Hub") {
					message.channel.send('Cannot add or remove from "' + to.name + '"');
					throw 'Cannot add or remove from "' + to.name + '"';
				}
				// Team lounges ("<Team> Lounge") are private to their team, and Coaches Lounge and Lockdown Lounge
				// aren't rooms. .c rejects room names containing "lounge", so this never blocks a competition room.
				if(/lounge/i.test(to.name)) {
					message.channel.send('Cannot add teams to "' + to.name + '". Lounges are private; `.a` only adds teams to competition rooms.');
					throw 'Cannot add to lounge "' + to.name + '"';
				}
				var pos = await coachPosition(message.guild);
				if(pos < 0) {
					message.channel.send('The Coach role has been deleted.  There must be a Coach role directly above the team roles.');
					throw 'Coach role deleted';
				}
				for(var role of roles) {
					if(!isTeamRole(role, pos)) {
						message.channel.send('Cannot add ' + describeRole(role) + ': it is not a team role.');
						throw 'Cannot add with non-team role ' + describeRole(role);
					}
				}
				var roleNames = "";
				if(roles.length < 1) {
					message.channel.send('No role specified for adding.');
					throw 'No role specified for adding';
				} else if(roles.length == 1) {
					roleNames = roles[0].toString();
				} else {
					for(var i=0; i<roles.length-1; i++) {
						roleNames += roles[i].toString();
						if(roles.length > 2) {
							roleNames += ", "
						}
					}
					roleNames += " and " + roles[roles.length-1].toString();
				}
				await confirm(message, 'Are you sure you want to add team(s) ' + roleNames + ' to room "' + to.name + '"? Confirm by reacting with \:thumbsup:.', force, function () {
					message.channel.send('No confirmation was received. The addition is cancelled.');
				}, async function () {
					// Catch each edit, so a failure doesn't end the command (and let the next queued one start)
					// while the other edits are still running, and so the teams that were added still get synced
					var failed = [];
					var failedError = null;
					await Promise.all(roles.map(role => addTeamToRoom(role, to).catch(function (error) {
						console.error('Could not add ' + role.name + ' to ' + to.name + ':', error);
						failed.push(role);
						failedError = failedError ?? error;
					})));
					var added = roles.filter(role => !failed.includes(role));
					if (added.length > 0) {
						await syncRoom(to);
						// Names, not mentions: team roles are mentionable, so a mention would ping every member
						await message.channel.send((added.length === 1 ? 'Team ' : 'Teams ') + listNamesForMessage(added.map(role => role.name), 'teams') +
							(added.length === 1 ? ' has' : ' have') + ' been added to room "' + to.name + '."');
					}
					if (failed.length > 0) {
						await message.channel.send('Could not add ' + listNamesForMessage(failed.map(role => role.name), 'teams') + ' to room "' + to.name + '." ' +
							(rateLimitMessage(failedError) ?? 'Check the room\'s permissions, or try again.'));
					}
				});
			} catch (e) {
				console.error(e);
				help(message.channel, ['a']);
			}
		} else if (cmd === 'r') {
			try {
				var roles = mentions.roles;
				var channels = mentions.channels;
				if(roles.length < 1 || channels.length < 1) {
					message.channel.send('Tag at least one team and the text channel of the room to remove them from.');
					throw 'Missing team or room for remove';
				}
				var from = channels[0].parent;
				if(from.name == "Control Room" || from.name == "Hub") {
					message.channel.send('Cannot add or remove from "' + from.name + '"');
					throw 'Cannot add or remove from "' + from.name + '"';
				}
				// A team's lounge is the category "<Team> Lounge" (see createTeam). Removing a team from its own lounge
				// would lock it out; removing any other team is allowed, to clean up one that got in by mistake.
				for(var role of roles) {
					if(role && from.name.toLowerCase() === (role.name + ' Lounge').toLowerCase()) {
						message.channel.send('Cannot remove ' + role.name + ' from its own lounge.');
						throw 'Cannot remove ' + role.name + ' from its own lounge';
					}
				}
				var pos = await coachPosition(message.guild);
				if(pos < 0) {
					message.channel.send('The Coach role has been deleted.  There must be a Coach role directly above the team roles.');
					throw 'Coach role deleted';
				}
				for(var role of roles) {
					if(!isTeamRole(role, pos)) {
						message.channel.send('Cannot remove ' + describeRole(role) + ': it is not a team role.');
						throw 'Cannot remove with non-team role ' + describeRole(role);
					}
				}
				var roleNames = listNames(roles);
				await confirm(message, 'Are you sure you want to remove team(s) ' + roleNames + ' from room "' + from.name + '"? Confirm by reacting with \:thumbsup:.', force, function () {
					message.channel.send('No confirmation was received. The removal is cancelled.');
				}, function	() {
					return remove(roles, from).then(function () {
						message.channel.send('Team(s) ' + roleNames + ' removed from room "' + from.name + '."');
					}).catch(function (error) {
						console.error(error);
						message.channel.send('Could not remove team(s) ' + roleNames + ' from room "' + from.name + '." Check the room\'s permissions.');
					});
				});
			} catch (e) {
				console.error(e);
				help(message.channel, ['r']);
			}
		} else if (cmd === 't') {
			try {
				var roles = mentions.roles;
				var channels = mentions.channels;
				if(roles.length < 1 || channels.length < 2) {
					message.channel.send('Tag at least one team, then the text channel of the room they are leaving, then the text channel of the room they are going to.');
					throw 'Missing team or rooms for transfer';
				}
				var from = channels[0].parent;
				var to = channels[1].parent;
				if(to.name == "Control Room" || to.name == "Hub") {
					message.channel.send('Cannot add or remove from "' + to.name + '"');
					throw 'Cannot add or remove from "' + to.name + '"';
				}
				if(from.name == "Control Room" || from.name == "Hub") {
					message.channel.send('Cannot add or remove from "' + from.name + '"');
					throw 'Cannot add or remove from "' + from.name + '"';
				}
				// Lounges are private to their team (see .a): transferring into one would let the wrong team in,
				// and transferring out of one would lock a team out of its own lounge.
				for(var room of [from, to]) {
					if(/lounge/i.test(room.name)) {
						message.channel.send('Cannot transfer teams into or out of "' + room.name + '". Lounges are private; `.t` only moves teams between competition rooms.');
						throw 'Cannot transfer with lounge "' + room.name + '"';
					}
				}
				var pos = await coachPosition(message.guild);
				if(pos < 0) {
					message.channel.send('The Coach role has been deleted.  There must be a Coach role directly above the team roles.');
					throw 'Coach role deleted';
				}
				for(var role of roles) {
					if(!isTeamRole(role, pos)) {
						message.channel.send('Cannot transfer ' + describeRole(role) + ': it is not a team role.');
						throw 'Cannot transfer non-team role ' + describeRole(role);
					}
				}
				var roleNames = listNames(roles);
				await confirm(message, 'Are you sure you want to transfer team(s) ' + roleNames + ' from room "' + from.name + '" to room "' + to.name + '"? Confirm by reacting with \:thumbsup:.', force, function () {
					message.channel.send('No confirmation was received. The transfer is cancelled.');
				}, async function	() {
					try {
						await remove(roles, from);
					} catch (error) {
						console.error(error);
						message.channel.send('Could not remove team(s) ' + roleNames + ' from room "' + from.name + '," so the transfer was stopped. Check the room\'s permissions.');
						return;
					}
					try {
						await add(roles, to);
					} catch (error) {
						console.error(error);
						message.channel.send('Warning: team(s) ' + roleNames + ' were removed from room "' + from.name + '" but could not be added to room "' + to.name + '," so they are not in either room. Use `.a` to add them.');
						return;
					}
					message.channel.send('Team(s) ' + roleNames + ' transferred from room "' + from.name + '" to room "' + to.name + '."');
				});
			} catch (e) {
				console.error(e);
				help(message.channel, ['t']);
			}
		} else if (cmd === 'e' && hasRole(message.member, 'Control Room')) {
			try {
				var channels = mentions.channels;
				if(channels.length == 0) {
					throw "empty empty.";
				}
				//check that they all look like competition rooms
				for(var channel of channels) {
					if(!isCompetitionRoom(channel?.parent)) {
						message.channel.send((channel?.parent ? '"' + channel.parent.name + '"' : 'That channel') + ' is not a competition room. `.e` only empties rooms made with `.c`.');
						throw 'Not a competition room for empty';
					}
				}
				await confirm(message, 'Are you sure you want to empty the specified rooms? Confirm by reacting with \:thumbsup:.', force, function () {
					message.channel.send('No confirmation was received. No rooms were emptied.');
				}, async function () {
					// Each room's permissions have their own rate limits, so all rooms are emptied at once.
					// That takes a few seconds even for many rooms, so there's no start or progress message.
					var rooms = [...new Map(channels.map(channel => [channel.parent.id, channel.parent])).values()];
					var failed = [];
					await Promise.all(rooms.map(room => empty(room).catch(function (error) {
						console.error('Could not empty room ' + room.name + ':', error);
						failed.push(room);
					})));
					var emptied = rooms.filter(room => !failed.includes(room)).map(room => '"' + room.name + '"');
					if (failed.length === 0) {
						await message.channel.send(rooms.length === 1 ? 'Emptied room ' + emptied[0] + '.' : 'Emptied all ' + rooms.length + ' rooms.');
					} else {
						await message.channel.send((emptied.length > 0 ? 'Emptied ' + listNamesForMessage(emptied, 'rooms') + ', but c' : 'C') +
							'ould not empty ' + listNamesForMessage(failed.map(room => '"' + room.name + '"'), 'rooms') +
							'. Check those rooms\' permissions, or try again.');
					}
				});
			} catch (e) {
				console.error(e);
				help(message.channel, ['e']);
			}
		} else if (cmd === 'i' && message.author.id === message.guild.ownerId) {
			if(command.indexOf(message.channel.guild.name) < 0) {
				help(message.channel, ['i']);
			} else {
				await confirm(message, 'Are you sure you want to initialize the server ' + message.channel.guild.name + '? Every channel and role currently in the server will be deleted. Confirm by reacting with \:thumbsup:.', force, function () {
					message.channel.send('No confirmation was received. The initialization is cancelled.');
				}, function () {
					var guild = message.channel.guild;
					return init(guild, message.channel).catch(function (e) {
						console.error(e);
						var report = 'Initialization of ' + guild.name + ' failed partway through. ' +
							(rateLimitMessage(e) ?? 'Check the bot console for details.');
						// init may have deleted the channel the command came from
						var reportChannel = guild.channels.cache.has(message.channel.id) ? message.channel :
								guild.channels.cache.find(channel => channel.name === 'bot-commands');
						if (reportChannel) {
							reportChannel.send(report).catch(console.error);
							help(reportChannel, ['i']);
						} else {
							// every channel may be gone, so tell the person who ran it directly
							message.author.send(report).catch(console.error);
						}
					});
				});
			}
		} else if (cmd === 'z' && message.author.id === message.guild.ownerId && message.author.id === (await client.application.fetch()).owner?.id) {

			message.channel.send('Writing member update log to server . . . ');
			try {
				console.log("Writing member update log.");
				const fetchedLogs = await message.guild.fetchAuditLogs({
					type: AuditLogEvent.MemberUpdate,
					limit: 1,
				});
				var outData = ""
				var prevEntry = fetchedLogs.entries.first();
				let {executor, target, changes} = prevEntry;
				outData += executor.tag + " changed " + target.tag + " " + changes['0'].key +
					" from " + changes['0'].old + " to " + changes['0'].new + "\n";
				while(1) {
					const fetchedLogs = await message.guild.fetchAuditLogs({
						type: AuditLogEvent.MemberUpdate,
						limit: 100,
						before: prevEntry,
					});
					if(!fetchedLogs.entries.size) {
						break;
					}
					fetchedLogs.entries.forEach(tempLog => {
						let {executor, target, changes} = tempLog;
						outData += executor.tag + " changed " + target.tag + " " + changes['0'].key +
							" from " + changes['0'].old + " to " + changes['0'].new + "\n";
					});
					prevEntry = fetchedLogs.entries.last();
				}
				fs.writeFile("MemberUpdateLog.txt", outData, function (err) {
					if(err) return console.log(err);
					console.log("Wrote member update log.");
					message.channel.send('Wrote member update log to server.');

				});
			} catch (e) {
				console.log(e)
				message.channel.send('Failed to write member update log to server.');
			}
		} else if (cmd === 'c' && hasRole(message.member, 'Control Room')) {
			try {
				var content = command.substr(command.indexOf(' ') + 1).trim();
				var names = content.split(/["“”]/g);
				if (names.length < 2) {
					help(message.channel, ['c']);
					return;
				}
				for (var i = 1; i < names.length; i+= 2) {
					var name = names[i];
					var Exp = /[a-z0-9]/i;
					var Exp2 = /^[a-zA-Z0-9._ -]+$/;
					if(!Exp.test(name)) {
						message.channel.send("Something is wrong with your list of room names.\nEither one of your rooms has no alphanumeric characters, or you missed a quotation mark.\nThese are the names I found, and I see a problem with name " + (Math.floor(i/2)+1) + ":");
						for (var j = 1; j < names.length; j += 2) {
							message.channel.send("" + (Math.floor(j/2)+1) + ": \"" + names[j] + "\"");
						}
						return;
					}
					if(!Exp2.test(name)) {
						message.channel.send("Room names can only have letters, numbers, spaces, hyphens, periods, and underscores, but no other special characters.\nThe room name \"" + name + "\" doesn't meet these requirements.");
						return;
					}
					// Discord caps channel names at 100 characters, and the text channel adds "-text"
					if(name.length >= MAX_NAME_LENGTH) {
						message.channel.send("Room names must be less than " + MAX_NAME_LENGTH + " characters long. The room name \"" + name + "\" is " + name.length + " characters.");
						return;
					}
					// The bot finds these categories by name, and treats any channel with "lounge" in its name as a
					// lounge (.w works there, and .l/.o move it), so rooms can't use them.
					if(RESERVED_CATEGORY_NAMES.includes(name.trim().toLowerCase()) || /lounge/i.test(name)) {
						message.channel.send("Room names cannot contain \"lounge\" or be \"Control Room\" or \"Hub\". The room name \"" + name + "\" doesn't meet these requirements.");
						return;
					}
					// A second category with the same name would be indistinguishable in the channel list,
					// and is what retrying a room after a failure used to create.
					var lowerName = name.trim().toLowerCase();
					if(message.guild.channels.cache.some(channel => channel.type === ChannelType.GuildCategory && channel.name.trim().toLowerCase() === lowerName) ||
						 names.slice(1, i).some((other, j) => j % 2 === 0 && other.trim().toLowerCase() === lowerName)) {
						message.channel.send("The room name \"" + name + "\" is already used by a category in this server or by another room in this command. No rooms were created.");
						return;
					}
				}
				await confirm(message, 'Are you sure you want to create the room[s] ' + content + '? Confirm by reacting with \:thumbsup:.', force, function () {
					message.channel.send('No confirmation was received. The creation is cancelled.');
				}, async function () {
					var roomNames = names.filter((n, idx) => idx % 2 === 1);
					var failed = new Set();
					var failReason = null;
					var leftovers = [];
					if (roomNames.length > 1) {
						await message.channel.send('Creating ' + roomNames.length + ' rooms. Each room takes about a second; progress will be posted every ' +
							(PROGRESS_INTERVAL_MS / 1000) + ' seconds . . .');
					}
					var roomDone = progressReporter(message.channel, roomNames.length, done => 'Created ' + done + ' of ' + roomNames.length + ' rooms');
					// All at once: Discord creates a server's channels one at a time anyway, in the order requested
					await Promise.all(roomNames.map(function (name) {
						return createRoom(message.channel.guild, name).catch(function (error) {
							console.error('Could not create room ' + name + ':', error.message ?? error);
							failed.add(name);
							failReason = failReason ?? rateLimitMessage(error);
							leftovers.push(...(error.leftovers ?? []));
						}).finally(roomDone);
					}));
					var created = roomNames.filter(n => !failed.has(n));
					if (created.length > 0) {
						await message.channel.send((created.length === 1 ? 'Room ' : 'Rooms ') + listNamesForMessage(created.map(n => '"' + n + '"'), 'rooms') +
							(created.length === 1 ? ' has' : ' have') + ' been created.');
					}
					if (failed.size > 0) {
						await message.channel.send('Could not create ' + listNamesForMessage([...failed].map(n => '"' + n + '"'), 'rooms') + '. ' +
							(failReason ?? 'Please try using different names.') + leftoversMessage(leftovers));
						if (!failReason) {
							help(message.channel, ['c']);
						}
					}
				});
			} catch (e) {
				console.error(e);
				help(message.channel, ['c']);
			}
			/*
				} else if (cmd === 'c' && hasRole(message.member, 'Control Room')) {
				// todo add the ability to create multiple rooms at once
				try {
				var name = command.substr(command.indexOf(' ') + 1).trim();
				if (name.length < 90) {
				confirm(message, 'Are you sure you want to create room "' + name + '"? Confirm by reacting with \:thumbsup:.', function () {
				message.channel.send('No confirmation was received. The creation is cancelled.');
				}, function () {
				createRoom(message.channel.guild, name).then(function (textChannel) {
				// message.channel.send('Room "' + name + '" has been created.');
				message.channel.send('Room "' + name + '" has been created.');
				}).catch(function (error) {
				console.error(error);
				message.channel.send('Room "' + name + '" could not be created. Please try using a different name.');
				help(message.channel, ['c']);
				});
				});
				} else {
				message.channel.send('The room name must be less than 90 characters.');
				}
				} catch (e) {
				console.error(e);
				help(message.channel, ['c']);
				}
			*/
		} else if (cmd === 'p') {
			try {
				var roles = mentions.roles;
				var pos = await coachPosition(message.guild);
				if(pos < 0) {
					message.channel.send('The Coach role has been deleted.  There must be a Coach role directly above the team roles.');
					throw 'Coach role deleted';
				}
				for(var role of roles) {
					if(!isTeamRole(role, pos)) {
						message.channel.send('Cannot change the color of ' + describeRole(role) + ': it is not a team role.');
						throw 'Cannot paint with non-team role ' + describeRole(role);
					}
				}
				var roleNames = "";
				if(roles.length < 1) {
					message.channel.send('No role specified for painting.');
					throw 'No role specified for painting.';
				} else if(roles.length == 1) {
					roleNames = roles[0].toString();
				} else {
					for(var i=0; i<roles.length-1; i++) {
						roleNames += roles[i].toString();
						if(roles.length > 2) {
							roleNames += ", "
						}
					}
					roleNames += " and " + roles[roles.length-1].toString();
				}
				var matches = command.match(/\#[A-F0-9]{6}/i);
				if(matches) {
					var newColor = matches[0];
					await confirm(message, 'Are you sure you want to paint ' + roleNames + ' to be ' + newColor + '? Confirm by reacting with \:thumbsup:.', force, function() {
						message.channel.send('No confirmation was received.  The painting is canceled.');
					}, function () {
						return paintTeams(message.channel, roles, currRole => recolorTo(currRole, newColor));
					});
				} else {
					await confirm(message, 'Are you sure you want to paint ' + roleNames + ' a new color? Confirm by reacting with \:thumbsup:.', force, function () {
						message.channel.send('No confirmation was received.  The painting is canceled.');
					}, function () {
						return paintTeams(message.channel, roles, currRole => recolor(currRole));
					});
				}
			} catch (e) {
				console.error(e);
				help(message.channel, ['p']);
			}
		} else if (cmd === 'd' && hasRole(message.member, 'Control Room')) {
			try {
				var channels = mentions.channels;

				//Check that there are channels
				if(channels.length < 1) {
					message.channel.send("No channel mentions found.  Make sure to use hash references to the text channel in a room.");
					throw 'No channel mentions.'
				}
				//check that they all look like competition rooms
				for(var channel of channels) {
					if(!isCompetitionRoom(channel?.parent)) {
						message.channel.send((channel?.parent ? '"' + channel.parent.name + '"' : 'That channel') + ' is not a competition room. `.d` only deletes rooms made with `.c`; delete anything else manually.');
						throw 'Not a competition room for delete';
					}
				}
				// One channel per room: mentioning both of a room's channels, or one twice, would delete it twice at once
				channels = [...new Map(channels.map(channel => [channel.parent.id, channel])).values()];
				await confirm(message, 'Are you sure you want to delete the specified room[s]? Confirm by reacting with \:thumbsup:.', force, function () {
					message.channel.send('No confirmation was received. The deletion is cancelled.');
				}, async function () {
					// read the names first; they can't be looked up once the categories are gone
					var roomNames = channels.map(text => '"' + text.parent.name + '"');
					// Indexes, not names: older servers can have two rooms with the same name
					var failedIndexes = new Set();
					var failedError = null;
					if (channels.length > 1) {
						await message.channel.send('Deleting ' + channels.length + ' rooms . . .');
					}
					var roomDone = progressReporter(message.channel, channels.length, done => 'Deleted ' + done + ' of ' + channels.length + ' rooms');
					await Promise.all(channels.map(function (text, i) {
						return deleteRoom(text).catch(function (error) {
							console.error(error);
							failedIndexes.add(i);
							failedError = failedError ?? error;
						}).finally(roomDone);
					}));
					var deleted = roomNames.filter((name, i) => !failedIndexes.has(i));
					var failed = roomNames.filter((name, i) => failedIndexes.has(i));
					if (deleted.length > 0) {
						await message.channel.send((deleted.length === 1 ? 'Room ' : 'Rooms ') + listNamesForMessage(deleted, 'rooms') +
							(deleted.length === 1 ? ' has' : ' have') + ' been deleted.');
					}
					if (failed.length > 0) {
						await message.channel.send('Could not delete ' + listNamesForMessage(failed, 'rooms') + '. ' +
							(rateLimitMessage(failedError) ?? 'Please delete them manually.'));
						help(message.channel, ['d']);
					}
				});
			} catch (e) {
				console.error(e);
				help(message.channel, ['d']);
			}
			/*} else if (cmd === 'f' && hasRole(message.member, 'Control Room')) {
				try {
				var teams = mentions.roles;
				confirm(message, 'Are you sure you want to create a finals room with teams ' + teams[0].toString() + ' and ' + teams[1].toString() + '? Confirm by reacting with \:thumbsup:.', force, function () {
				message.channel.send('No confirmation was received. The creation is cancelled.');
				}, function () {
				finalsRoom(message.channel.guild, teams[0], teams[1]).then(function (textChannel) {
				// message.channel.send('A finals room has been created');
				message.channel.send('A finals room has been created.');
				}).catch(function (error) {
				console.error(error);
				message.channel.send('A finals room could not be created. Please create it manually.');
				help(message.channel, ['f']);
				});
				});
				} catch (e) {
				console.error(e);
				help(message.channel, ['f']);
				}
				} else if (cmd === 's' && hasRole(message.member, 'Control Room')) {
				try {
				var content = command.split(/\s+/g);
				var url = parseUrl(content[1]);
				var docID = url.pathname.split('/')[3];
				var sheetIndex = content[2] || Infinity;
				if (sheetIndex === Infinity) {
				sheetIndex = 0;
				}
				confirm(message, 'Are you sure you want to generate room schedules from the specified spreadsheet? Confirm by reacting with \:thumbsup:.', force, function () {
				message.channel.send('No confirmation was received. The schedule generation is cancelled.');
				}, function () {
				schedule(message.channel.guild, docID, sheetIndex).then(function () {
				message.channel.send('A schedule was generated.');
				}).catch(function (error) {
				console.error(error);
				message.channel.send('The schedule could not be generated.');
				help(message.channel, ['s']);
				});
				});
				} catch (e) {
				console.error(e);
				help(message.channel, ['s']);
				}*/
		} else if (cmd === 'n' && hasRole(message.member, 'Control Room')) {
			try {
				var content = command.substr(command.indexOf(' ') + 1).trim();
				var names = content.split(/["“”]/g);
				if(names.length < 2) {
					help(message.channel, ['b', 'n']);
					return;
				}
				var coachPos = await coachPosition(message.guild);
				var existingTeams = [];
				for (var i = 1; i < names.length; i+= 2) {
					var name = names[i];
					var Exp = /[a-z0-9]/i;
					var Exp2 = /^[a-zA-Z0-9._-]+$/;
					if(!Exp.test(name)) {
						message.channel.send("Something is wrong with your list of team names.\nEither one of your teams has no alphanumeric characters, or you missed a quotation mark.\nThese are the names I found, and I see a problem with name " + (Math.floor(i/2)+1) + ":");
						for (var j = 1; j < names.length; j += 2) {
							message.channel.send("" + (Math.floor(j/2)+1) + ": \"" + names[j] + "\"");
						}
						return;
					}
					if(!Exp2.test(name)) {
						message.channel.send("Team names can only have letters, numbers, periods, underscores, and hyphens, but no spaces or other special characters.");
						message.channel.send("The team name \"" + name + "\" doesn't meet these requirements.")
						return;
					}
					// The lounge's text channel is "<name>-lounge-text", which must fit in Discord's 100 characters
					if(name.length >= MAX_TEAM_NAME_LENGTH) {
						message.channel.send("Team names must be less than " + MAX_TEAM_NAME_LENGTH + " characters long. The team name \"" + name + "\" is " + name.length + " characters.");
						return;
					}
					var duplicate = names.slice(1, i).some((other, j) => j % 2 === 0 && other.toLowerCase() === name.toLowerCase());
					// A team from an earlier .n isn't created again, only given Hub access if it's missing,
					// so a .n whose Hub step failed can be run again to finish its teams
					var existingTeam = duplicate ? null : existingTeamRole(message.guild, name, coachPos);
					if(existingTeam) {
						existingTeams.push(existingTeam);
						continue;
					}
					if(roleNameInUse(message.guild, name) || duplicate) {
						message.channel.send("The team name \"" + name + "\" is already used by a role in this server, by a role the bot needs, or by another team in this command. No teams were created.");
						return;
					}
					// Normally the lounge goes with the role, but a failed creation can leave the lounge behind
					var loungeName = (name + ' Lounge').toLowerCase();
					if(message.guild.channels.cache.some(channel => channel.type === ChannelType.GuildCategory && channel.name.trim().toLowerCase() === loungeName)) {
						message.channel.send("There is already a category named \"" + name + " Lounge\". Delete it before creating the team \"" + name + "\". No teams were created.");
						return;
					}
				}

				await confirm(message, 'Are you sure you want to create the team[s] ' + content + '? Confirm by reacting with \:thumbsup:.', force, function () {
					message.channel.send('No confirmation was received. The new team creation is cancelled.');
				}, async function () {
					try {
						var existingNames = existingTeams.map(role => role.name.toLowerCase());
						var teamNames = names.filter((n, idx) => idx % 2 === 1 && !existingNames.includes(n.toLowerCase()));
						if (existingTeams.length > 0) {
							await message.channel.send(listNamesForMessage(existingTeams.map(role => role.name), 'teams') +
								(existingTeams.length === 1 ? ' already exists' : ' already exist') + ', so ' + (existingTeams.length === 1 ? 'it' : 'they') +
								' will not be created again, only given Hub access if missing.');
						}
						var created = [];
						var createdRoles = [];
						var failed = [];
						var failReason = null;
						var leftovers = [];
						// Nothing else is posted until the teams are built, so say that work has started
						if (teamNames.length > 0) await message.channel.send('Creating ' + teamNames.length + ' team' + (teamNames.length === 1 ? '' : 's') +
							'. Each team takes about a second; progress will be posted every ' + (PROGRESS_INTERVAL_MS / 1000) + ' seconds . . .');
						var teamDone = progressReporter(message.channel, teamNames.length, done => 'Created ' + done + ' of ' + teamNames.length + ' teams');
						await runWithConcurrency(teamNames, TEAM_CREATION_CONCURRENCY, async function (name) {
							try {
								createdRoles.push(await createTeam(message.channel.guild, name));
								created.push(name);
							} catch (error) {
								console.error('Could not create team ' + name + ':', error.message ?? error);
								failed.push(name);
								failReason = failReason ?? rateLimitMessage(error);
								leftovers.push(...(error.leftovers ?? []));
							}
							teamDone();
						});
						// Report in the order the teams were listed, not the order they finished
						created = teamNames.filter(n => created.includes(n));
						failed = teamNames.filter(n => failed.includes(n));
						if (teamNames.length > 0) await message.channel.send('Created ' + created.length + ' of ' + teamNames.length + ' teams' +
							(created.length > 0 ? ': ' + listNamesForMessage(created, 'teams') : '') + '.');
						if (failed.length > 0) {
							if (failReason) {
								await message.channel.send('These teams could not be created: ' + listNamesForMessage(failed, 'teams') + '. ' + failReason + leftoversMessage(leftovers));
							} else {
								await message.channel.send('These teams could not be created: ' + listNamesForMessage(failed, 'teams') + '. Please try using different names.' + leftoversMessage(leftovers));
								help(message.channel, ['b', 'n']);
							}
						}
						//sync all voice channels with category, then
						// disable the chat channel in the voice channels
						//I don't see a better way to do this.  I wish
						// I could just disable voice channel chat.
						var hubRoles = createdRoles.concat(existingTeams);
						if (hubRoles.length === 0) {
							return;
						}
						message.channel.send("Adjusting permissions in hub ...");
						try {
							await addTeamsToHub(message.channel.guild, hubRoles);
							var generalChannel = await message.channel.guild.channels.cache.find(channel => channel.name === "general");
							await syncHubChannels(generalChannel.parent);
						} catch (error) {
							console.error('Could not give teams Hub access:', error);
							await message.channel.send('Could not finish giving ' + listNamesForMessage(hubRoles.map(role => role.name), 'teams') +
								' access to the Hub. ' + (rateLimitMessage(error) ?? '') +
								' Their roles and lounges exist; run the same `.n` command again to finish them.');
							return;
						}
						message.channel.send("Done");
					} catch (e) {
						console.log(e.stack);
						message.channel.send("Something went wrong creating the team");
					}
				});
			} catch (e) {
				console.error(e);
				help(message.channel, ['b', 'n']);
			}
		/*} else if (cmd === 'm' && hasRole(message.member, 'Control Room')) {
			try {
				var range = command.split(/\s+/g)[1];
				confirm(message, 'Are you sure you want to mass create teams from the range ' + range + '? Confirm by reacting with \:thumbsup:.', force, function () {
					message.channel.send('No confirmation was received. The creation is cancelled.');
				}, function () {
					var splitByBracket = range.split('[');
					var prefix = splitByBracket[0];
					var splitByEllipsis = splitByBracket[1].split('...');
					var startIndex = Number(splitByEllipsis[0]);
					var endIndex = Number(splitByEllipsis[1].substr(0, splitByEllipsis[1].length - 1));
					massCreateTeams(message.channel.guild, prefix, startIndex, endIndex).then(function () {
						message.channel.send('The teams were created.');
					}).catch(function (error) {
						console.error(error);
						message.channel.send('The teams could not be created.');
						help(message.channel, ['b', 'n']);
					});
				});
			} catch (e) {
				console.error(e);
				help(message.channel, ['b', 'n']);
			}*/
			/*} else if (cmd === 'b' && hasRole(message.member, 'Control Room')) {
				var bitrate = NaN;
				try {
				var bitrate = Number(command.substring(command.indexOf(' ')));
				} catch (e) {}
				if (!bitrate || bitrate < 8) {
				message.channel.send('An invalid bitrate was specified. Please try again.');
				} else {
				confirm(message, 'Are you sure you want to set the bitrate of every voice channel in the server to ' + bitrate + ' kbps? Confirm by reacting with \:thumbsup:.', force, function () {
				message.channel.send('No confirmation was received. The server bitrate remains unchanged.');
				}, function () {
				setGuildBitrate(bitrate, message.channel.guild).then(function () {
				message.channel.send('Every voice channel in the server now has a bitrate of ' + bitrate + ' kbps.');
				}).catch(function (error) {
				console.error(error);
				message.channel.send('The server bitrate could not be changed.');
				help(message.channel, ['b']);
				});
				});
				}*/
		} else if (cmd === 'g' && hasRole(message.member, 'Control Room')) {
			try {
				let role = message.guild.roles.cache.find(r => r.name === 'Control Room');
				var users = mentions.users;
				var userNames = "";
				if(users.length < 1) {
					message.channel.send("No user specified for adding to Control Room.");
					throw 'No user specified to add to Control Room.';
				} else if (users.length == 1) {
					userNames = users[0].toString();
				} else {
					for(var i=0; i<users.length-1; i++) {
						userNames += users[i].toString();
						if(users.length > 2) {
							userNames += ", "
						}
					}
					userNames += " and " + users[users.length-1].toString();
				}
				await confirm(message, "DANGER!  Are you sure you want to grant users(s) " + userNames + " Control Room privileges? Confirm by reacting with \:thumbsup:.", force, function() {
					message.channel.send("No confirmation was received.  The granting of privileges was cancelled.");
				}, async function() {
					for (const user of users) {
						try {
							await user.roles.add(role);
							await message.channel.send("Added " + user.toString() + " to Control Room.");
						} catch (error) {
							console.error(error);
							message.channel.send("Could not add " + user.toString() + " to Control Room.").catch(console.error);
						}
					}
				});
			} catch(e) {
				console.error(e);
				help(message.channel, ['g', 'u']);
			}
		} else if (cmd === 'u' && hasRole(message.member, 'Control Room')) {
			try {
				let role = message.guild.roles.cache.find(r => r.name === 'Control Room');
				var users = mentions.users;
				var userNames = "";
				for(var i=0; i<users.length; i++) {
					if(users[i].id == message.author.id) {
						message.channel.send("You cannot remove yourself from Control Room.");
						throw 'User tried to remove self from Control Room.'
					}
				}
				if(users.length < 1) {
					message.channel.send("No user specified for removing from Control Room.");
					throw 'No user specified to remove from Control Room.';
				} else if (users.length == 1) {
					userNames = users[0].toString();
				} else {
					for(var i=0; i<users.length-1; i++) {
						userNames += users[i].toString();
						if(users.length > 2) {
							userNames += ", "
						}
					}
					userNames += " and " + users[users.length-1].toString();
				}
				await confirm(message, "Are you sure you want to remove users(s) " + userNames + " from Control Room privileges? Confirm by reacting with \:thumbsup:.", force, function() {
					message.channel.send("No confirmation was received.  The revocation of privileges was cancelled.");
				}, async function() {
					for (const user of users) {
						try {
							await user.roles.remove(role);
							await message.channel.send("Removed " + user.toString() + " from Control Room.");
						} catch (error) {
							console.error(error);
							message.channel.send("Could not remove " + user.toString() + " from Control Room.").catch(console.error);
						}
					}
				});
			} catch(e) {
				console.error(e);
				help(message.channel, ['g','u']);
			}
		} else if (cmd === 'l' && hasRole(message.member, 'Control Room')) {
			await confirm(message, 'Are you sure you want to lock down the lounge?  Confirm by reacting with \:thumbsup:.', force,
							function () {
								message.channel.send("No confirmation was received.  Locking the lounge canceled.");
							},
							function() {
								message.channel.send("Locking down the lounge.  This could take a while . . . ");
								return lockdownLounge(message.channel.guild, message).then(function() {
									message.channel.send('Lounge is locked down.');
								}).catch(function (error) {
									console.error(error);
									message.channel.send("Lockdown failed.");
									help(message.channel, ['l', 'o']);
								});
							});
		} else if (cmd === 'o' && hasRole(message.member, 'Control Room')) {
			await confirm(message, 'Are you sure you want to open the lounge?  Confirm by reacting with \:thumbsup:.', force,
							function() {
								message.channel.send('No confirmation received.  Unlocking the lounge canceled.');
							},
							function() {
								message.channel.send("Unlocking the lounge.  This could take a while . . . ");
								return unlockLounge(message.channel.guild, message).then(function() {
									message.channel.send('Lounge is unlocked.');
								}).catch(function (error) {
									console.error(error);
									message.channel.send("Unlock failed.");
									help(message.channel, ['l', 'o']);
								});
							});
		} else if (cmd === 'k' && hasRole(message.member, 'Control Room')) {
			var generalChannel = await message.channel.guild.channels.cache.find(channel => channel.name === "general");
			var hubCategory = generalChannel.parent;
			console.log("Hub: " + hubCategory);
			const tempPermissions = generalChannel.parent.permissionOverwrites;
			console.log(tempPermissions)
		} else if (cmd === 'h') {
			help(message.channel);
		} else if (/^\.[a-z]/i.test(command) && (hasRole(message.member, 'Control Room') || hasRole(message.member, 'Staff'))) {
			// Unknown command, or one this person can't run. Lines like "..." aren't commands, so they get no reply.
			message.channel.send('Use the `.help` command to get started!');
		}
	}
  return;
};

//////////////////////////////////////////////////////////////////////
// Optional profiling of Discord API traffic. Turn it on with PROFILE=1 (e.g. `PROFILE=1 node tournament.js`).
// After each command it logs the wall time, how many API calls it made (by route), how long discord.js
// held requests back to stay under rate limits, and any 429s Discord returned anyway.
// The counters are global. Staff commands on one server run one at a time, but commands on different
// servers (or a `.w` alongside a staff command) can overlap and mix their numbers.
const PROFILE = process.env.PROFILE === '1';
var profileStats = null;

var resetProfileStats = function () {
	profileStats = { calls: 0, byRoute: new Map(), waits: 0, waitMs: 0, maxWaitMs: 0, waitsByRoute: new Map(), got429: 0, retryAfterMs: 0 };
}

if (PROFILE) {
	resetProfileStats();
	client.rest.on('response', function (request, response) {
		var key = request.method.toUpperCase() + ' ' + request.route;
		profileStats.calls++;
		profileStats.byRoute.set(key, (profileStats.byRoute.get(key) || 0) + 1);
		if (response.status === 429) {
			profileStats.got429++;
			var retryAfter = Number(response.headers.get('retry-after')) * 1000 || 0;
			profileStats.retryAfterMs += retryAfter;
			console.log('[profile] 429 on ' + key + ', retry after ' + retryAfter + 'ms, scope ' + response.headers.get('x-ratelimit-scope'));
		}
	});
	// Fired when discord.js waits *before* sending because it knows the bucket is empty
	client.rest.on('rateLimited', function (info) {
		var key = info.method.toUpperCase() + ' ' + info.route + (info.global ? ' (global)' : '');
		profileStats.waits++;
		profileStats.waitMs += info.timeToReset;
		profileStats.maxWaitMs = Math.max(profileStats.maxWaitMs, info.timeToReset);
		profileStats.waitsByRoute.set(key, (profileStats.waitsByRoute.get(key) || 0) + info.timeToReset);
		// Logged as it happens, so a long wait doesn't look like a silent hang
		if (info.timeToReset >= 2000) {
			console.log('[profile] ' + new Date().toLocaleTimeString() + ' waiting ' + (info.timeToReset / 1000).toFixed(1) +
				's on ' + key + ' (limit ' + info.limit + ', scope ' + info.scope + ')');
		}
	});
	// discord.js's own notes on rate limits; skip its routine bucket-hash and cache-sweep messages
	client.rest.on('restDebug', function (text) {
		// \b so "429" inside a bucket hash like 2955783cf8922429... doesn't match
		if (/\b429\b|rate limit/i.test(text)) {
			console.log('[profile] ' + new Date().toLocaleTimeString() + ' ' + text);
		}
	});
}

var reportProfile = function (command, startMs) {
	var s = profileStats;
	var lines = ['[profile] "' + command.slice(0, 60) + '" took ' + ((Date.now() - startMs) / 1000).toFixed(1) + 's: ' +
		s.calls + ' API calls, ' + s.waits + ' rate-limit waits totaling ' + (s.waitMs / 1000).toFixed(1) + 's (longest ' +
		(s.maxWaitMs / 1000).toFixed(1) + 's), ' + s.got429 + ' 429s (' + (s.retryAfterMs / 1000).toFixed(1) + 's retry-after)'];
	for (var [route, count] of [...s.byRoute].sort((a, b) => b[1] - a[1])) {
		lines.push('[profile]   ' + String(count).padStart(4) + '  ' + route);
	}
	for (var [route, ms] of [...s.waitsByRoute].sort((a, b) => b[1] - a[1])) {
		lines.push('[profile]   waited ' + (ms / 1000).toFixed(1) + 's on ' + route);
	}
	console.log(lines.join('\n'));
}

// Staff commands run one message at a time per server. Several commands read a whole overwrite list and
// write it back with set() (addTeamsToHub, empty), so two overlapping commands could silently undo each
// other's changes, e.g. `.e` on a room wiping a team that a concurrent `.a` had just added.
// Maps guild id -> promise that settles when the last queued message on that server finishes.
var guildCommandQueues = new Map();

var QUEUED_REACTION = '⏳';

var runInGuildQueue = async function (message, work) {
	var guildId = message.guild.id;
	var previous = guildCommandQueues.get(guildId);
	if (previous) {
		// Show the message was seen and is waiting, so a long `.n` ahead of it doesn't look like a hang
		message.react(QUEUED_REACTION).catch(console.error);
	}
	// catch() so one failed message doesn't stop everything queued behind it
	var current = (previous || Promise.resolve()).catch(function () {}).then(async function () {
		if (previous) {
			var reaction = message.reactions.cache.get(QUEUED_REACTION);
			if (reaction) {
				reaction.users.remove(client.user.id).catch(console.error);
			}
		}
		await work();
	});
	guildCommandQueues.set(guildId, current);
	try {
		await current;
	} finally {
		// Drop the entry once nothing is queued behind this message, so idle servers don't hold a promise
		if (guildCommandQueues.get(guildId) === current) {
			guildCommandQueues.delete(guildId);
		}
	}
}

var runCommandLines = async function (lines, message) {
	for (var str of lines) {
		var startMs = Date.now();
		if (PROFILE) {
			resetProfileStats();
		}
		try {
			await processCommand(str, message);
		} catch (e) {
			console.error('Error processing command "' + str + '":', e);
		}
		// Skip ordinary chat, which makes no API calls
		if (PROFILE && profileStats.calls > 0) {
			reportProfile(str, startMs);
		}
	}
}

client.on('messageCreate', async function (message) {
	// Ignore messages from bots (including this one) and anything outside a server
	if (message.author.bot || !message.guild) {
		return;
	}
	var lines = message.content.split('\n');
	// Ordinary chat and `.w` don't change permissions, so they don't wait behind staff commands
	if (lines.some(line => isStaffCommand(line, message))) {
		await runInGuildQueue(message, () => runCommandLines(lines, message));
	} else {
		await runCommandLines(lines, message);
	}
});

//////////////////////////////////////////////////////////////////////
//Delete polls
client.on('raw', async function(raw) {
	//console.log(raw);
	if(!(raw && raw.t && raw.t == 'MESSAGE_CREATE' && raw.d && raw.d.poll && raw.d.guild_id)) {
		return;
	}
	try {
		// fetch (not cache.get) so polls in threads the bot hasn't loaded are still found
		const channel = await client.channels.fetch(raw.d.channel_id);
		const guild = channel.guild;
		// member is null if the poster has already left; their poll is still deleted
		const member = await guild.members.fetch(raw.d.author.id).catch(() => null);
		const msg = await channel.messages.fetch(raw.d.id);

		if(!hasRole(member, 'Control Room')) {
			var msgString = "Poll posted by \"" + member?.nickname + "\" (" + raw.d.author.id + ": " + raw.d.author.username + ") in \"" + channel.name + "\" with question \"" + raw.d.poll?.question?.text + "\" and options ";
			var textOptions = [];
			for(const answer of raw.d.poll?.answers ?? []) {
				textOptions.push("\"" + answer?.poll_media?.text + "\"")
			}
			msgString += textOptions.join(", ");
			console.log(msgString);
			let botChannel = guild?.channels?.cache?.find(channel => channel.name === "bot-commands");
			await msg?.delete();
			await botChannel?.send(msgString);
		}
	} catch (e) {
		console.error('Error handling poll:', e);
	}
	return;
});
//Delete polls
//////////////////////////////////////////////////////////////////////

// Safety net: log errors instead of letting one failed Discord call crash the bot on every server.
// (Since Node 15, an unhandled promise rejection exits the process.)
process.on('unhandledRejection', function (error) {
	console.error('Unhandled error:', error);
});
client.on(Events.Error, function (error) {
	console.error('Discord client error:', error);
});

client.login(config.BOT_TOKEN);

client.once(Events.ClientReady, async c => {
  for(var [flake, guild] of client.guilds.cache) {
		try {
			const owner = await guild.fetchOwner();
			console.log(guild.name + ' (owner: ' + owner.user.username + ')');
		} catch (e) {
			console.log(guild.name);
		}
  }
	c.user.setActivity('.help', {type: ActivityType.Listening});
	console.log(`Ready!  Logged in as ${c.user.tag}`);
});

/*
client.on('ready', function () {
  client.guilds.cache.forEach(guild => {
		try {
			console.log(guild.name + ' ' + guild.owner.user.tag);
		} catch (e) {
			console.log(guild.name);
		}
  });
  client.user.setActivity('.help', {type: 'LISTENING'}).then(function () {
		console.log('up and running!');
  }).catch(console.error);
});
*/
