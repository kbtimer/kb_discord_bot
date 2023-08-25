const { Client, Events, GatewayIntentBits, GuildDefaultMessageNotifications, PermissionFlagsBits, PermissionsBitField, Colors, ChannelType, AuditLogEvent } = require('discord.js');
const fs = require('fs');
const client = new Client({ intents: [GatewayIntentBits.Guilds,
																			GatewayIntentBits.GuildMessages,
																			GatewayIntentBits.MessageContent,
																			GatewayIntentBits.GuildMessageReactions,
																			GatewayIntentBits.GuildMembers] });
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
		value: 'This command can only be run by users with the Control Room role. Room names must be less than 90 characters long. Surround the room names with double quotation marks. If you want to create multiple rooms at a time, separate the room names with spaces. \nExample bot-style usage: `.c "Room 1" "Room 2"`\nExample NL-style usage: `.create "Room 1" "Room 2"`'
  },
  //'f': {
	//name: 'Create Finals Room',
	//value: 'This command creates a special finals room that contains a channel for the playing teams to type in and a channel for everyone else to comment in. The command requires you to tag the two teams who are competing in the finals. Teams cannot be added or removed from a finals room. This command can only be run by users with the Control Room role.\nExample bot-style usage: `.f @A2 @B1`\nExample NL-style usage: `.finals @A2 and @B1`'
  //},
  'd': {
		name: 'Delete Room',
		value: 'This command can only be run by users with the Control Room role.\nExample bot-style usage: `.d #room-1-text`\nExample NL-style usage: `.delete #room-1-text`'
  },
  'b': {
		name: 'Manually Create/Delete Team',
		value: 'Team roles can be created manually in your tournament server\'s settings. Make sure all team roles are __below__ the Coach role, do not use any pre-existing role names, and are mentionable.'
  },
	'n': {
		name: 'New Team[s]',
		value: 'This command can only by run by users with the Control Room role.  Specify a list of teams names to create in double quotation marks, separated by spaces.\nExample bot-style usage: `.n "AHS-A" "AHS-B" "BHS-A" "BHS-B"`\nExample NL-style usage: `.new-teams "AHS-A" "AHS-B" "BHS-A" "BHS-B"`'
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
		value: 'This command can be run by Control Room or Staff roles. Specify one or more teams by their roles to add.\nExample bot-style usage: `.a @A2 @A3 #room-1-text`\nExample NL-style usage: `.add @A2 @A3 to #room-1-text`'
  },
  'r': {
		name: 'Remove Team from Room',
		value: 'This command can be run by Control Room or Staff roles.\nExample bot-style usage: `.r @A2 #room-1-text`\nExample NL-style usage: `.remove @A2 from #room-1-text`'
  },
  't': {
		name: 'Transfer Team between Rooms',
		value: 'This command can be run by Control Room or Staff roles. It requires you to tag two channels; tag the room that you are transferring the team __from__ first, and tag the channel that you are transferring the team __to__ second.\nExample bot-style usage: `.t @A2 #room-1-text #room-3-text`\nExample NL-style usage: `.transfer @A2 from #room-1-text to #room-3-text`'
  },
  'e': {
		name: 'Empty Room',
		value: 'This command can only be run by users with the Control Room role.  It removes all teams from a given room.\nExample bot-style usage: `.e #room-1-text`\nExample NL-style usage: `.empty #room-1-text`'
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
	const roleNames = member.roles.cache.map(r => r.name);
	if(roleNames.includes(roleName)) {
		//console.log("Found role " + roleName);
		return true;
	}
	//console.log("Didn't find role " + roleName);
  return false;
}

var lockPerms = async function (channel) {
  // syncs channel's perms with its parent category
  await channel.lockPermissions();
  //await channel.lockPermissions();
  //await channel.lockPermissions();
  //await channel.lockPermissions();
	return Promise.resolve("Success");
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

var getMentions = function (content, guild) {
  var splitOnSpaces = content.split(/\s+/);
  var mentions = {
    roles: [],
    channels: [],
		users: []
  };
  for (var substr of splitOnSpaces) {
		var id = false;
		if(id = getUserIDFromMention(substr)) {
			//console.log("ID: " + id + "\n");
			mentions.users.push(guild.members.resolve(id));
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

var disableVoiceChannelChatInCategory = async function(category) {
	var promises = Array();

	for(var [flake, channel] of category.children.cache) {
		if (channel.type === ChannelType.GuildVoice) {
			var overwrites = channel.permissionOverwrites.cache;
			var newPerms = Array();
			for(var [flake2, overwrite] of overwrites) {
				var currPerms = {};
				currPerms.id = overwrite.id;
				var allow = overwrite.allow
				var deny = overwrite.deny
				allow = allow.remove([PermissionFlagsBits.SendMessages,
															PermissionFlagsBits.AddReactions,
															PermissionFlagsBits.ReadMessageHistory]);
				deny = deny.add([PermissionFlagsBits.SendMessages,
												 PermissionFlagsBits.AddReactions,
												 PermissionFlagsBits.ReadMessageHistory]);
				newPerms.push({
					id: overwrite.id,
					allow: allow,
					deny: deny
				});
				//await channel.permissionOverwrites.set([
					//{
						//id: overwrite.id,
						//deny: [PermissionFlagsBits.SendMessages,
									 //PermissionFlagsBits.AddReactions,
									 //PermissionFlagsBits.ReadMessageHistory]
					//}]);

				//promises.push(removeSendReactHistory(overwrite));
			}
			await channel.permissionOverwrites.set(newPerms);
			//var roles = category.guild.roles.cache;
			//for(var [flake2, role] of roles) {
				//console.log("  Removing access for " + role.name);
				//channel.permissionOverwrites.edit(role, {
					//SendMessages: false,
					//AddReactions: false,
					//ReadMessageHistory: false
				//});
			//}
		}
	}
	await Promise.all(promises);
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

var add = async function (role, to) {
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
	for(var [flake, channel] of to.children.cache) {
		await lockPerms(channel);
	}
	await disableVoiceChannelChatInCategory(to);
  //var children = to.children.array();
  //await lockPerms(children[0]);
  //await lockPerms(children[1]);
  return role.toString();
}

var remove = async function (role, from) {
  await from.permissionOverwrites.delete(role);
	for(var [flake, channel] of from.children.cache) {
		await lockPerms(channel);
	}
	await disableVoiceChannelChatInCategory(from);
	//edit(role, {
	  //ViewChannel: false,
		//SendMessages: false,
		//Connect: false,
		//AddReactions: false,
		//ReadMessageHistory: false,
		//Speak: false
		//'USE_EXTERNAL_EMOJIS': false,
		//'ATTACH_FILES': false,
		//'EMBED_LINKS': false
  //});
  //var	children = from.children.array();
  //await lockPerms(children[0]);
  //await lockPerms(children[1]);
  return;
}

var recolor = async function (role) {
	await role.setColor(randomColor());
	return role.toString();
}

var recolorTo = async function (role, color) {
	await role.setColor(color);
	return role.toString();
}

var empty = async function (room) {
  var overwrites = room.permissionOverwrites.cache;
  for (var [flake, overwrite] of overwrites) {
		var role = await room.guild.roles.fetch(overwrite.id);
		try {
	    //	    console.log(role.name);
	    if (role.name !== '@everyone' && role.name !== 'Staff' &&
					role.name !== 'Spectator' && role.name !== 'Coach') {
				await overwrite.delete();
	    }
		} catch (e) {
	    // user overwrite, i guess
	    //console.log(role);
	    await overwrite.delete();
		}
  }
	for(var [flake, channel] of room.children.cache) {
		await lockPerms(channel);
	}
	await disableVoiceChannelChatInCategory(room);

  //var children = room.children.array();
  //await lockPerms(children[0]);
  //await lockPerms(children[1]);
  //await lockPerms(children[0]);
  //await lockPerms(children[1]);
  return;
}

var createRoom = async function (guild, name, staffSpectatorInvisible) {
  var category = await guild.channels.create({name: name, type: ChannelType.GuildCategory});
  await category.permissionOverwrites.edit(guild.roles.everyone, {
		ViewChannel: false
  });
  var staffRole = guild.roles.cache.find(r => r.name === 'Staff')
	var spectatorRole = guild.roles.cache.find(r => r.name === 'Spectator')

  if (!staffSpectatorInvisible) {
		await category.permissionOverwrites.edit(staffRole, {
	    ViewChannel: true
		});
		await category.permissionOverwrites.edit(spectatorRole, {
	    ViewChannel: true
		});
  }
  var cleanName = name.replace(/\s+/g, '-').toLowerCase();
  var text = await guild.channels.create({name: cleanName + '-text', parent: category});
  var voice = await guild.channels.create({name: cleanName + '-voice', parent: category, type: ChannelType.GuildVoice});
  return text;
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

var init = async function (guild) {
  // basic setup of the tournament server
	//console.log("In init");
  await guild.setDefaultMessageNotifications(GuildDefaultMessageNotifications.OnlyMentions);
	//console.log("In init 2");
  var existingRoles = guild.roles.cache;
  for (var [flake, role] of existingRoles) {
		if (role.name !== '@everyone' && role.name !== 'CKB Bot' && role.name !== 'ckbbot' && role.name !== 'Server Booster' && role.name !== 'Test CKB Bot Local') {
	    try {
				await role.delete();
	    } catch (e) {
				console.error('could not delete role: ' + role.name);
				console.error(e);
	    }
		}
  } // empty out existing roles so the correct ones can take their place
  existingChannels = guild.channels.cache;
  for (var [flake, channel] of existingChannels) {
		await channel.delete();
  }
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
	guild.roles.everyone.setPermissions(basePermissions);
  var controlRoomRole = await guild.roles.create({
	  name: 'Control Room',
	  color: Colors.Purple,
	  hoist: true,
	  permissions: PermissionFlagsBits.Administrator,
	  mentionable: true,
	  position: 1
  });
  var staffRole = await guild.roles.create({
	  name: 'Staff',
	  color: Colors.Blue,
	  hoist: true,
		permissions: staffPermissions,
	  mentionable: true,
	  position: 1
  });
  var spectatorRole = await guild.roles.create({
	  name: 'Spectator',
	  color: Colors.DarkGrey,
	  hoist: true,
	  mentionable: true,
	  position: 1
  });
  var coachRole = await guild.roles.create({
	  name: 'Coach',
	  color: 0x546E7A, // same as bottom right role color
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
	disableVoiceChannelChatInCategory(controlRoomCategory);


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
  announcementsChannel.send(guild.name + ' is committed to ensuring that Knowledge Bowl is safe, open, and welcoming for everyone. If anyone at this tournament makes you feel unsafe or unwelcome, please do not hesitate to reach out to anyone with the ' + controlRoomRole.toString() + ' or ' + staffRole.toString() + ' roles.');

	//general channel won't be synced with hub category
	//  so that @everyone can read and write it
	var generalChannel = await guild.channels.create({name: 'general', parent: hubCategory});
	await generalChannel.permissionOverwrites.edit(guild.roles.everyone, {
		SendMessages: true,
		ViewChannel: true,
		AddReactions: false
  });
	generalChannel.setRateLimitPerUser(3);


  var hallwayVoiceChannel = await guild.channels.create({name: 'hallway-voice', parent: hubCategory, type: ChannelType.GuildVoice});
	//make some lounge channels for people to talk to each other
	var loungeChannel = await guild.channels.create({name: 'lounge-text', parent: hubCategory});
	loungeChannel.setRateLimitPerUser(10);
	var loungeVoiceChannel1 = await guild.channels.create({name: 'lounge-voice-1', parent: hubCategory, type: ChannelType.GuildVoice});
	var loungeVoiceChannel2 = await guild.channels.create({name: 'lounge-voice-2', parent: hubCategory, type: ChannelType.GuildVoice});
	var loungeVoiceChannel3 = await guild.channels.create({name: 'lounge-voice-3', parent: hubCategory, type: ChannelType.GuildVoice});
	var loungeVoiceChannel4 = await guild.channels.create({name: 'lounge-voice-4', parent: hubCategory, type: ChannelType.GuildVoice});
	//Voice channels won't be synced, either, so that I can
	// disable the text chat on them.  So they'll be regularly synced,
	// then disabled over and over and over because . . . Discord.
	disableVoiceChannelChatInCategory(hubCategory);


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
	disableVoiceChannelChatInCategory(coachesLoungeCategory);


  await (await guild.fetchOwner()).roles.add(controlRoomRole);
  await guild.setDefaultMessageNotifications(GuildDefaultMessageNotifications.OnlyMentions);
  await guild.setSystemChannel(generalChannel);
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
	var h = Math.random();//Math.pow(Math.random()*2.0 - 1.0, 1.0/3.0)/3.0 + 1.0/3.0;
	var s = Math.random()*0.6 + 0.3;
	var v = Math.random()*0.25 + 0.75;
	var color = hsvToRgb2(h, s, v);
	return color;
}

var addToHub = async function(guild, role) {
	var generalChannel = await guild.channels.cache.find(channel => channel.name === "general");
	await generalChannel.parent.permissionOverwrites.edit(role, {
		ViewChannel: true,
		SendMessages: true,
		Connect: true,
		AddReactions: true,
		ReadMessageHistory: true,
		Speak: true
	});

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
	await channel.setParent(destinationCategory);
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
		lockdownCategory.permissionOverwrites.edit(guild.roles.everyone, {
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

	lockdownCategory.delete();

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

var createTeam = async function (guild, name) {
	var color = randomColor();
	//console.log("Creating role " + name);
	var teamRole = await guild.roles.create({
		name: name,
		color: color,
		hoist: true,
		mentionable: true//,
		//position: 1
	});
	//console.log("Created role " + name);
	//console.log("Creating lounge " + name + " Lounge");
	var loungeText = await createRoom(guild, name + ' Lounge', true);
	//console.log("Created lounge " + name + " Lounge");
	//console.log("Adding role " + name + " to lounge " + loungeText.name);
	await add(teamRole, loungeText.parent);
	//await add(teamRole, loungeText.parent);
	//console.log("Added role " + name + " to lounge " + loungeText.name);
	//Overwrite default READ_MESSAGE_HISTORY from add function
	//console.log("updating read_message_history for " + name);
	await loungeText.parent.permissionOverwrites.edit(teamRole, {
		ReadMessageHistory: true
	});
	//console.log("updated read_message_history for " + name);
	//console.log("Adding " + name + " to hub");
	await addToHub(guild, teamRole);
	//console.log("Added " + name + " to hub");

	return name;
}

var massCreateTeams = async function (guild, prefix, startIndex, endIndex) {
  for (var i = startIndex; i <= endIndex; i++) {
		var name = prefix + String(i);
		await createTeam(guild, name);
  }
	//sync all voice channels with category, then
	// disable the chat channel in the voice channels
	//I don't see a better way to do this.  I wish
	// I could just disable voice channel chat.
	await syncVoiceChannelsToCategory(generalChannel.parent);
	disableVoiceChannelChatInCategory(generalChannel.parent);

  return;
}

var setGuildBitrate = async function (bitrate, guild) {
  for (var channel of guild.channels.cache.array()) {
		if (channel.type === ChannelType.GuildVoice) {
	    await channel.setBitrate(bitrate * 1000);
			//	    console.log('set bitrate for ' + channel.name);
		}
  }
  return;
}

var confirm = async function (message, prompt, force, failCallback, successCallback) {
  if (force) {

		message.react('👍');
		successCallback();
		return;
  }

  message.channel.send(prompt).then(function (msg) {
		msg.react('👍');
		//console.log("Waiting for reactions");
		//console.log("Looking for reactions where user id is " + message.author.id);
		const filter = (reaction, user) => reaction.emoji.name === '👍' && user.id === message.author.id;
		msg.awaitReactions({ filter, time: 6000 })
			.then(function (collected) {
	    if (collected.size === 0) {
				failCallback();
	    } else {
				successCallback();
	    }
		}).catch(console.error);
  });
}

var processCommand = async function (command, message) {

	//console.log("In processCommand, processing the command " + command);
	//These are commands that can be run by anyone
	if (command.indexOf('.w') === 0 && message.channel.name.indexOf("lounge") > -1) {
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

		var teamName = channelName.substring(0, channelName.indexOf("-lounge"));

		message.channel.send('Hello ' + teamName + "! Your secret code for today's written is " + code);

	} else if(hasRole(message.member, 'Control Room') || hasRole(message.member, 'Staff') || message.member === await message.channel.guild.fetchOwner()) {

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
		var mentions = getMentions(command, message.guild);
		if (command.indexOf('.a') === 0) {
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
				var pos = await coachPosition(message.guild);
				if(pos < 0) {
					message.channel.send('The Coach role has been deleted.  There must be a Coach role directly above the team roles.');
					throw 'Coach role deleted';
				}
				for(var i=0; i<roles.length; i++) {
					if(roles[i].position >= pos) {
						message.channel.send('Cannot add with non-team role ' + roles[i].toString());
						throw 'Cannot add with non-team role ' + roles[i].toString();
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
				confirm(message, 'Are you sure you want to add team(s) ' + roleNames + ' to room "' + to.name + '"? Confirm by reacting with \:thumbsup:.', force, function () {
					message.channel.send('No confirmation was received. The addition is cancelled.');
				}, async function () {
					var promises = Array();
					for(var i=0; i<roles.length; i++) {
						var currRole = roles[i];
						try {
							promises.push(addTeamToRoom(currRole, to, message.channel));
						} catch (e) {
							console.error(e)
							help(message.channel, ['a']);
						}
					}
					await Promise.all(promises);
					//sync all voice channels with category, then
					// disable the chat channel in the voice channels
					//I don't see a better way to do this.  I wish
					// I could just disable voice channel chat.
					await syncVoiceChannelsToCategory(to);
					await disableVoiceChannelChatInCategory(to);
				});
			} catch (e) {
				console.error(e);
				help(message.channel, ['a']);
			}
		} else if (command.indexOf('.r') === 0) {
			try {
				var roles = mentions.roles;
				var role = roles[0];
				var channels = mentions.channels;
				var from = channels[0].parent;
				if(from.name == "Control Room" || from.name == "Hub") {
					message.channel.send('Cannot add or remove from "' + from.name + '"');
					throw 'Cannot add or remove from "' + from.name + '"';
				}
				var pos = await coachPosition(message.guild);
				if(pos < 0) {
					message.channel.send('The Coach role has been deleted.  There must be a Coach role directly above the team roles.');
					throw 'Coach role deleted';
				}
				if(role.position >= pos) {
					message.channel.send('Cannot remove with non-team role ' + role.toString());
					throw 'Cannot remove with non-team role ' + role.toString();
				}
				confirm(message, 'Are you sure you want to remove team ' + role.toString() + ' from room "' + from.name + '"? Confirm by reacting with \:thumbsup:.', force, function () {
					message.channel.send('No confirmation was received. The removal is cancelled.');
				}, function	() {
					remove(role, from).then(function () {
						message.channel.send('Team ' + role.toString() + ' has been removed from room "' + from.name + '."');
					}).catch(function (error) {
						console.error(error);
						help(message.channel, ['r']);
					});
				});
			} catch (e) {
				console.error(e);
				help(message.channel, ['r']);
			}
		} else if (command.indexOf('.t') === 0) {
			try {
				var roles = mentions.roles;
				var role = roles[0];
				var channels = mentions.channels;
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
				var pos = await coachPosition(message.guild);
				if(pos < 0) {
					message.channel.send('The Coach role has been deleted.  There must be a Coach role directly above the team roles.');
					throw 'Coach role deleted';
				}
				if(role.position >= pos) {
					message.channel.send('Cannot transfer non-team role ' + role.toString());
					throw 'Cannot transfer non-team role ' + role.toString();
				}
				confirm(message, 'Are you sure you want to transfer team ' + role.toString() + ' from room "' + from.name + '" to room "' + to.name + '"? Confirm by reacting with \:thumbsup:.', force, function () {
					message.channel.send('No confirmation was received. The transfer is cancelled.');
				}, function	() {
					remove(role, from).then(function () {
						add(role, to).then(function () {
							message.channel.send('Team ' + role.toString() + ' has been transferred from room "' + from.name + '" to room "' + to.name + '."');
						}).catch(function (error) {
							console.error(error);
							help(message.channel, ['t']);
						});
					}).catch(function (error) {
						console.error(error);
						help(message.channel, ['t']);
					});
				});
			} catch (e) {
				console.error(e);
				help(message.channel, ['t']);
			}
		} else if (command.indexOf('.e') === 0 && hasRole(message.member, 'Control Room')) {
			try {
				var channels = mentions.channels;
				if(channels.length == 0) {
					throw "empty empty.";
				}
				//check that they all look like competition rooms
				for(var i=0; i<channels.length; i++) {
					if(channels[i].parent.children.cache.size != 2) {
						message.channel.send('"' + channels[i].parent.name + '" does not look like a competition room.');
						throw 'too many channels in a category for empty';
					}
				}
				var clearChannel = function (index) {
					empty(channels[index].parent).then(function () {
						message.channel.send('Emptied room "' + channels[index].parent.name + '."');
						if (index < channels.length - 1) {
							clearChannel(index + 1);
						} else {
							message.channel.send('All specified rooms emptied.');
						}
					});
				}
				confirm(message, 'Are you sure you want to empty the specified rooms? Confirm by reacting with \:thumbsup:.', force, function () {
					message.channel.send('No confirmation was received. No rooms were emptied.');
				}, function () {
					clearChannel(0);
				});
			} catch (e) {
				console.error(e);
				help(message.channel, ['e']);
			}
		} else if (command.indexOf('.i') === 0 && message.member === await(message.channel.guild.fetchOwner())) {
			if(command.indexOf(message.channel.guild.name) < 0) {
				help(message.channel, ['i']);
			} else {
				confirm(message, 'Are you sure you want to initialize the server ' + message.channel.guild.name + '? Every channel and role currently in the server will be deleted. Confirm by reacting with \:thumbsup:.', force, function () {
					message.channel.send('No confirmation was received. The initialization is cancelled.');
				}, function () {
					init(message.channel.guild, message.channel).catch(function (e) {
						console.error(e);
						help(message.channel, ['i']);
					});
				});
			}
		} else if (command.indexOf('.z') === 0 && message.member === await message.channel.guild.fetchOwner() && message.member.user === (await client.application.fetch()).owner) {

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
		} else if (command.indexOf('.c') === 0 && hasRole(message.member, 'Control Room')) {
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
				}
				confirm(message, 'Are you sure you want to create the room[s] ' + content + '? Confirm by reacting with \:thumbsup:.', force, function () {
					message.channel.send('No confirmation was received. The creation is cancelled.');
				}, function () {
					for (var i = 1; i < names.length; i += 2) {
						var name = names[i];
						createRoom(message.channel.guild, name).then(function (textChannel) {
							// message.channel.send('Room "' + name + '" has been created.');
							message.channel.send('Room "' + textChannel.parent.name + '" has been created.');
						}).catch(function (error) {
							console.error(error);
							message.channel.send('Could not be create room "' + textChannel + '". Please try using a different name.');
							help(message.channel, ['c']);
						});
					}
				});
			} catch (e) {
				console.error(e);
				help(message.channel, ['c']);
			}
			/*
				} else if (command.indexOf('.c') === 0 && hasRole(message.member, 'Control Room')) {
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
		} else if (command.indexOf('.p') === 0) {
			try {
				var roles = mentions.roles;
				var pos = await coachPosition(message.guild);
				if(pos < 0) {
					message.channel.send('The Coach role has been deleted.  There must be a Coach role directly above the team roles.');
					throw 'Coach role deleted';
				}
				for(var i=0; i<roles.length; i++) {
					if(roles[i].position >= pos) {
						message.channel.send('Cannot change color of non-team role ' + roles[i].toString());
						throw 'Cannot paint with non-team role ' + roles[i].toString();
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
				matches = command.match(/\#[A-F0-9]{6}/);
				if(matches) {
					var newColor = matches[0];
					confirm(message, 'Are you sure you want to paint ' + roleNames + ' to be ' + newColor + '? Confirm by reacting with \:thumbsup:.', force, function() {
						message.channel.send('No confirmation was received.  The painting is canceled.');
					}, function () {
						for(var i=0; i<roles.length; i++) {
							var currRole = roles[i];
							recolorTo(currRole, newColor).then(function (teamName) {
								message.channel.send('Team ' + teamName + ' has been given a new color.');
							}).catch(function (error) {
								console.error(error);
								help(message.channel, ['p']);
							});
						}
					});
				} else {
					confirm(message, 'Are you sure you want to paint ' + roleNames + ' a new color? Confirm by reacting with \:thumbsup:.', force, function () {
						message.channel.send('No confirmation was received.  The painting is canceled.');
					}, function () {
						for(var i=0; i<roles.length; i++) {
							var currRole = roles[i];
							recolor(currRole).then(function (teamName) {
								message.channel.send('Team ' + teamName + ' has been given a new color."');
							}).catch(function (error) {
								console.error(error);
								help(message.channel, ['p']);
							});
						}
					});
				}
			} catch (e) {
				console.error(e);
				help(message.channel, ['p']);
			}
		} else if (command.indexOf('.d') === 0 && hasRole(message.member, 'Control Room')) {
			try {
				var channels = mentions.channels;

				//Check that there are channels
				if(channels.length < 1) {
					message.channel.send("No channel mentions found.  Make sure to use hash references to the text channel in a room.");
					throw 'No channel mentions.'
				}
				//check that they all look like competition rooms
				for(var i=0; i<channels.length; i++) {
					if(channels[i].parent.children.cache.size != 2) {
						message.channel.send('"' + channels[i].parent.name + '" does not look like a competition room.  Please delete it manually.');
						throw 'too many channels in a category for delete';
					}
				}
				confirm(message, 'Are you sure you want to delete the specified room[s]? Confirm by reacting with \:thumbsup:.', force, function () {
					message.channel.send('No confirmation was received. The deletion is cancelled.');
				}, function () {
					for (var text of channels) {
						deleteRoom(text).then(function (name) {
							message.channel.send('Room "' + name + '" has been deleted.');
						}).catch(function (error) {
							console.error(error);
							message.channel.send('Room "' + text + '" could not be deleted. Please delete it manually.')
							help(message.channel, ['d']);
						});
					}
				});
			} catch (e) {
				console.error(e);
				help(message.channel, ['d']);
			}
			/*} else if (command.indexOf('.f') === 0 && hasRole(message.member, 'Control Room')) {
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
				} else if (command.indexOf('.s') === 0 && hasRole(message.member, 'Control Room')) {
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
		} else if (command.indexOf('.n') === 0 && hasRole(message.member, 'Control Room')) {
			try {
				var content = command.substr(command.indexOf(' ') + 1).trim();
				var names = content.split(/["“”]/g);
				if(names.length < 2) {
					help(message.channel, ['b', 'n', 'm']);
					return;
				}
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
				}

				confirm(message, 'Are you sure you want to create the team[s] ' + content + '? Confirm by reacting with \:thumbsup:.', force, function () {
					message.channel.send('No confirmation was received. The new team creation is cancelled.');
				}, async function () {
					try {
						for (var i = 1; i < names.length; i += 2) {
							var name = names[i];
							//if(!name.match(Exp)) {
							//console.log("Something isn't right");//messsage.channel.send("Something isn't right");
							//throw "Bad name.  Check your .n command";
							//}
							//console.log("Creating team " + name );
							await createTeam(message.channel.guild, name).then(function (teamName) {
								message.channel.send('Team "' + teamName + '" has been created.');
							}).catch(function (error) {
								console.error(error);
								message.channel.send('Team "' + name + '" could not be created. Please try using a different name.');
								help(message.channel, ['b', 'n', 'm']);
							});
						}
						//sync all voice channels with category, then
						// disable the chat channel in the voice channels
						//I don't see a better way to do this.  I wish
						// I could just disable voice channel chat.
						message.channel.send("Adjusting permissions in hub ...");
						var generalChannel = await message.channel.guild.channels.cache.find(channel => channel.name === "general");
						message .channel.send("--Syncing voice channels to category");
						await syncVoiceChannelsToCategory(generalChannel.parent);
						message .channel.send("--Disabling voice chat channels");
						await disableVoiceChannelChatInCategory(generalChannel.parent);
						message.channel.send("Done");
					} catch (e) {
						console.log(e.stack);
						message.channel.send("Something went wrong creating the team");
					}
				});
			} catch (e) {
				console.error(e);
				help(message.channel, ['b', 'n', 'm']);
			}
		/*} else if (command.indexOf('.m') === 0 && hasRole(message.member, 'Control Room')) {
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
						help(message.channel, ['b', 'n', 'm']);
					});
				});
			} catch (e) {
				console.error(e);
				help(message.channel, ['b', 'n', 'm']);
			}*/
			/*} else if (command.indexOf('.b') === 0 && hasRole(message.member, 'Control Room')) {
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
		} else if (command.indexOf('.g') === 0 && hasRole(message.member, 'Control Room')) {
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
					userNames += " and " + userNames[usernames.length-1].toString();
				}
				confirm(message, "DANGER!  Are you sure you want to grant users(s) " + userNames + " Control Room privileges? Confirm by reacting with \:thumbsup:.", force, function() {
					message.channel.send("No confirmation was received.  The granting of privileges was cancelled.");
				}, function() {

					for(var i=0; i<users.length; i++) {
						users[i].roles.add(role).catch(function(error) {
							console.error(error);
							help(message.channel, ['g','u']);
						});
						message.channel.send("Added " + users[i].toString() + " to Control Room.");
					}
				});
			} catch(e) {
				console.error(e);
				help(message.channel, ['g', 'u']);
			}
		} else if (command.indexOf('.u') === 0 && hasRole(message.member, 'Control Room')) {
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
					userNames += " and " + userNames[usernames.length-1].toString();
				}
				confirm(message, "Are you sure you want to remove users(s) " + userNames + " from Control Room privileges? Confirm by reacting with \:thumbsup:.", force, function() {
					message.channel.send("No confirmation was received.  The revocation of privileges was cancelled.");
				}, function() {

					for(var i=0; i<users.length; i++) {
						users[i].roles.remove(role).catch(function(error) {
							console.error(error);
							help(message.channel, ['g', 'u']);
						});
						message.channel.send("Removed " + users[i].toString() + " from Control Room.");
					}
				});
			} catch(e) {
				console.error(e);
				help(message.channel, ['g','u']);
			}
		} else if (command.indexOf('.l') === 0 && hasRole(message.member, 'Control Room')) {
			confirm(message, 'Are you sure you want to lock down the lounge?  Confirm by reacting with \:thumbsup:.', force,
							function () {
								message.channel.send("No confirmation was received.  Locking the lounge canceled.");
							},
							function() {
								message.channel.send("Locking down the lounge.  This could take a while . . . ");
								lockdownLounge(message.channel.guild, message).then(function() {
									message.channel.send('Lounge is locked down.');
								}).catch(function (error) {
									console.error(error);
									message.channel.send("Lockdown failed.");
									help(message.channel, ['l', 'o']);
								});
							});
		} else if (command.indexOf('.o') === 0 && hasRole(message.member, 'Control Room')) {
			confirm(message, 'Are you sure you want to open the lounge?  Confirm by reacting with \:thumbsup:.', force,
							function() {
								message.channel.send('No confirmation received.  Unlocking the lounge canceled.');
							},
							function() {
								message.channel.send("Unlocking the lounge.  This could take a while . . . ");
								unlockLounge(message.channel.guild, message).then(function() {
									message.channel.send('Lounge is unlocked.');
								}).catch(function (error) {
									console.error(error);
									message.channel.send("Unlock failed.");
									help(message.channel, ['l', 'o']);
								});
							});
		} else if (command.indexOf('.k') == 0 && hasRole(message.member, 'Control Room')) {
			var generalChannel = await message.channel.guild.channels.cache.find(channel => channel.name === "general");
			var hubCategory = generalChannel.parent;
			console.log("Hub: " + hubCategory);
			const tempPermissions = generalChannel.parent.permissionOverwrites;
			console.log(tempPermissions)
		} else if (command.indexOf('.h') === 0) {
			help(message.channel);
		} else if (command.indexOf('.') === 0 && (hasRole(message.member, 'Control Room') || hasRole(message.member, 'Staff'))) {
			message.channel.send('Use the `.help` command to get started!');
		}
	}
  return;
};

client.on('messageCreate', async function (message) {
	//console.log(message);
	var content = message.content.split('\n');
	for (var str of content) {
		//console.log("processing " + str);
		//console.log("Send by " + message.member);
		//console.log("guild owner: " + await(message.channel.guild.fetchOwner()));
		await processCommand(str, message);
	}
  return;
});

client.login(config.BOT_TOKEN);

client.once(Events.ClientReady, c => {
  for(var [flake, guild] of client.guilds.cache) {
		try {
			console.log(guild.name + ' ' + guild.owner.user.tag);
		} catch (e) {
			console.log(guild.name);
		}
  }
	c.user.setActivity('.help', {type: 'LISTENING'});
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
