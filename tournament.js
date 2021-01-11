const Discord = require('discord.js');
const fs = require('fs');
const parseUrl = require('parse-url');
const client = new Discord.Client();
//const config = JSON.parse(String(fs.readFileSync(__dirname + '/config.json')));
const config = require("./config.json");

var helpSections = {
  'i': {
		name: 'Initialize Server',
		value: 'This command __deletes every preexisting channel and role in the server__ and replaces them with a predetermined tournament server skeleton. The CKB Bot role needs to be the highest in the server for this command to run properly. This command can only be run by the server owner.\nExample bot-style usage: `.i`\nExample NL-style usage: `.initialize-server`'
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
  'g': {
		name: 'Manually Create/Delete Team',
		value: 'Team roles can be created manually in your tournament server\'s settings. Make sure all team roles are __below__ the Coach role, do not use any pre-existing role names, and are mentionable.'
  },
	'n': {
		name: 'New Team[s]',
		value: 'This command can only by run by users with the Control Room role.  Specify a list of teams names to create in double quotation marks, separated by spaces.\nExample bot-style usage: `.n "AHS-A" "AHS-B" "BHS-A" "BHS-B"`\nExample NL-style usage: `.new-teams "AHS-A" "AHS-B" "BHS-A" "BHS-B"`'
	},
  'm': {
		name: 'Mass Create Teams',
		value: 'This command can only be run by users with the Control Room role. Specify a prefix and a range of numbers using this notation: `Prefix[Start...End]`. The bot will automatically create roles for each number in the specified range, randomly assign colors, and create lounges.\nExample bot-style usage: `.m Team[1...3]`\nExample NL-style usage: `.mass-create-teams Team[1...3]`'
  },
	//    's': {
	//	name: 'Create Room Schedules from Google Sheets',
	//	value: 'This command can only be run by users with the Control Room role. This command is fairly complicated, so ask Karan how to use it.'
	//    },
  'a': {
		name: 'Add Team to Room',
		value: 'This command can be run by Control Room or Staff roles.\nExample bot-style usage: `.a @A2 #room-1-text`\nExample NL-style usage: `.add @A2 to #room-1-text`'
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
  'h': {
		name: 'Display This Help',
		value: 'Example bot-style usage: `.h`\nExample NL-style usage: `.help`'
  }
}

var hasRole = function (member, roleName) {
  var roles = member.roles.cache.array();
  for (var role of roles) {
		if (role.name === roleName) {
	    return true;
		}
  }
  return false;
}

var lockPerms = async function (channel) {
  // syncs channel's perms with its parent category
  await channel.lockPermissions();
  await channel.lockPermissions();
  await channel.lockPermissions();
  await channel.lockPermissions();
}

var getMentions = function (content, guild) {
  var splitOnSpaces = content.split(/\s+/);
  var mentions = {
    roles: [],
    channels: []
  };
  for (var substr of splitOnSpaces) {
    if (substr[0] === '<' && substr[substr.length - 1] === '>') {
      if (substr.length === 22 && substr[1] === '@' && substr[2] === '&') {
        var snowflake = substr.replace(/[\<\@\&\>]/g, '');
        mentions.roles.push(guild.roles.resolve(snowflake));
      } else if (substr.length === 21 && substr[1] === '#') {
        var snowflake = substr.replace(/[\<\#\>]/g, '');
        mentions.channels.push(guild.channels.resolve(snowflake));
      }
    }
  }
  return mentions;
}

var coachPosition = async function(guild) {
	var coachRole = 0;
  for (var currRole of guild.roles.cache.array()) {
		if (currRole.name === 'Coach' && coachRole === 0) {
	    coachRole = currRole;
		}
  }
	if(coachRole === 0) {
		return -1;
	}
	return coachRole.position;
}

var add = async function (role, to) {
  await to.updateOverwrite(role, {
		'VIEW_CHANNEL': true,
		'SEND_MESSAGES': true,
		'CONNECT': true,
		'ADD_REACTIONS': true,
		'READ_MESSAGE_HISTORY': false,
		'SPEAK': true
		//'USE_EXTERNAL_EMOJIS': true,
		//'ATTACH_FILES': true,
		//'EMBED_LINKS': true
  });
  var children = to.children.array();
  await lockPerms(children[0]);
  await lockPerms(children[1]);
  await lockPerms(children[0]);
  await lockPerms(children[1]);
  return;
}

var remove = async function (role, from) {
  await from.updateOverwrite(role, {
		'VIEW_CHANNEL': false,
		'SEND_MESSAGES': false,
		'CONNECT': false,
		'ADD_REACTIONS': false,
		'READ_MESSAGE_HISTORY': false,
		'SPEAK': false
		//'USE_EXTERNAL_EMOJIS': false,
		//'ATTACH_FILES': false,
		//'EMBED_LINKS': false
  });
  var	children = from.children.array();
  await lockPerms(children[0]);
  await lockPerms(children[1]);
  await lockPerms(children[0]);
  await lockPerms(children[1]);
  return;
}

var recolor = async function (role) {
	await role.setColor(randomColor());
	return;
}

var empty = async function (room) {
  var overwrites = room.permissionOverwrites.array();
  for (var overwrite of overwrites) {
		var role = await room.guild.roles.fetch(overwrite.id);
		try {
	    //	    console.log(role.name);
	    if (role.name !== '@everyone' && role.name !== 'Staff' &&
					role.name !== 'Spectator' && role.name !== 'Coach') {
				await overwrite.delete();
	    }
		} catch (e) {
	    // user overwrite, i guess
	    console.log(role);
	    await overwrite.delete();
		}
  }
  var children = room.children.array();
  await lockPerms(children[0]);
  await lockPerms(children[1]);
  await lockPerms(children[0]);
  await lockPerms(children[1]);
  return;
}

var createRoom = async function (guild, name, staffSpectatorInvisible) {
  var category = await guild.channels.create(name, {type: 'category'});
  await category.updateOverwrite(guild.roles.everyone, {
		'VIEW_CHANNEL': false
  });
  var staffRole = 0, spectatorRole = 0;
  for (var role of guild.roles.cache.array()) {
		if (role.name === 'Staff' && staffRole === 0) {
	    staffRole = role;
		} else if (role.name === 'Spectator' && spectatorRole === 0) {
	    spectatorRole = role;
		}
  }
  if (!staffSpectatorInvisible) {
		await category.updateOverwrite(staffRole, {
	    'VIEW_CHANNEL': true
		});
		await category.updateOverwrite(spectatorRole, {
	    'VIEW_CHANNEL': true
		});
  }
  var cleanName = name.replace(/\s+/g, '-').toLowerCase();
  var text = await guild.channels.create(cleanName + '-text', {parent: category});
  var voice = await guild.channels.create(cleanName + '-voice', {parent: category, type: 'voice'});
  return text;
}

var deleteRoom = async function (text) {
  var category = text.parent;
  var name = category.name;
  for (var channel of category.children.array()) {
		await channel.delete();
  }
  await category.delete();
  return name;
}

var init = async function (guild) {
  // basic setup of the tournament server
  // todo clear all existing stuff in the server
  await guild.setDefaultMessageNotifications('MENTIONS');
  var existingRoles = guild.roles.cache.array(); // does this really load all the roles? cache business confuses me D:
  for (var role of existingRoles) {
		if (role.name !== '@everyone' && role.name !== 'CKB Bot' && role.name !== 'ckbbot' && role.name !== 'Server Booster') {
	    try {
				await role.delete();
	    } catch (e) {
				console.error('could not delete role: ' + role.name);
				console.error(e);
	    }
		}
  } // empty out existing roles so the correct ones can take their place
  existingChannels = guild.channels.cache.array(); // shrug
  for (var channel of existingChannels) {
		await channel.delete();
  }
	const basePermissions = ['CHANGE_NICKNAME', 'VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'CONNECT', 'SPEAK', 'USE_VAD'];
	const  staffPermissions = [].concat(basePermissions, ['STREAM', 'MANAGE_MESSAGES', 'EMBED_LINKS', 'ATTACH_FILES', 'MENTION_EVERYONE', 'MUTE_MEMBERS', 'MANAGE_NICKNAMES', 'MOVE_MEMBERS']);
	const coachPermissions = staffPermissions;
	guild.roles.everyone.setPermissions(basePermissions);
  var controlRoomRole = await guild.roles.create({
		data: {
	    name: 'Control Room',
	    color: 'PURPLE',
	    hoist: true,
	    permissions: 'ADMINISTRATOR',
	    mentionable: true,
	    position: 1
		}
  });
  var staffRole = await guild.roles.create({
		data: {
	    name: 'Staff',
	    color: 'BLUE',
	    hoist: true,
			permissions: staffPermissions,
	    mentionable: true,
	    position: 1
		}
  });
  var spectatorRole = await guild.roles.create({
		data: {
	    name: 'Spectator',
	    color: 'AQUA',
	    hoist: true,
	    mentionable: true,
	    position: 1
		}
  });
  var coachRole = await guild.roles.create({
		data: {
	    name: 'Coach',
	    color: 'RED',
	    hoist: true,
			permissions: coachPermissions,
	    mentionable: true,
	    position: 1
		}
  });
  var controlRoomCategory = await guild.channels.create('Control Room', {type: 'category'});
  await controlRoomCategory.updateOverwrite(guild.roles.everyone, {
		'VIEW_CHANNEL': false
  });
  await controlRoomCategory.updateOverwrite(staffRole, {
		'VIEW_CHANNEL': true
  });
  var linksChannel = await guild.channels.create('announcements-and-links', {parent: controlRoomCategory});
  await linksChannel.updateOverwrite(staffRole, {
		'SEND_MESSAGES': false
  });
  /*
    var packetsChannel = await guild.channels.create('packets', {parent: controlRoomCategory});
    await packetsScoresheetsChannel.updateOverwrite(staffRole, {
    'SEND_MESSAGES': false
    });
  */
  var protestsChannel = await guild.channels.create('protests', {parent: controlRoomCategory});
  var botCommandsChannel = await guild.channels.create('bot-commands', {parent: controlRoomCategory});
  var controlRoomChannel = await guild.channels.create('control-room', {parent: controlRoomCategory});
  var controlRoomVoiceChannel = await guild.channels.create('control-room-voice', {parent: controlRoomCategory, type: 'voice'});
	await controlRoomChannel.updateOverwrite(staffRole, {
		'VIEW_CHANNEL': false
	});
	await controlRoomVoiceChannel.updateOverwrite(staffRole, {
		'VIEW_CHANNEL': false
	});
  var readerRoomChannel = await guild.channels.create('reader-room', {parent: controlRoomCategory});
  var readerRoomVoiceChannel = await guild.channels.create('reader-room-voice', {parent: controlRoomCategory, type: 'voice'});


	//Hub is where students get announcements and interact with each other
	var hubCategory = await guild.channels.create('Hub', {type: 'category'});
  await hubCategory.updateOverwrite(guild.roles.everyone, {
		'VIEW_CHANNEL': false
  });
  await hubCategory.updateOverwrite(staffRole, {
		'VIEW_CHANNEL': true
  });
  await hubCategory.updateOverwrite(spectatorRole, {
		'VIEW_CHANNEL': true
  });
  await hubCategory.updateOverwrite(coachRole, {
		'VIEW_CHANNEL': true
  });

	//announcements channel won't be synced with hub category
	//  so that @everyone can read it (but not write)
  //control room has implicit permissions to post in announcements
  var announcementsChannel = await guild.channels.create('announcements', {parent: hubCategory});
  await announcementsChannel.updateOverwrite(guild.roles.everyone, {
		'VIEW_CHANNEL': true,
		'SEND_MESSAGES': false,
		'READ_MESSAGE_HISTORY': true
  });
  announcementsChannel.send(guild.name + ' is committed to ensuring that Knowledge Bowl is safe, open, and welcoming for everyone. If anyone at this tournament makes you feel unsafe or unwelcome, please do not hesitate to reach out to anyone with the ' + controlRoomRole.toString() + ' or ' + staffRole.toString() + ' roles.');

	//general channel won't be synced with hub category
	//  so that @everyone can read and write it
	var generalChannel = await guild.channels.create('general', {parent: hubCategory});
	await generalChannel.updateOverwrite(guild.roles.everyone, {
		'SEND_MESSAGES': true,
		'VIEW_CHANNEL': true
  });


  var hallwayVoiceChannel = await guild.channels.create('hallway-voice', {parent: hubCategory, type: 'voice'});
	//make some lounge channels for people to talk to each other
	var loungeChannel = await guild.channels.create('lounge-text', {parent: hubCategory});
	var loungeVoiceChannel1 = await guild.channels.create('lounge-voice-1', {parent: hubCategory, type: 'voice'});
	var loungeVoiceChannel2 = await guild.channels.create('lounge-voice-2', {parent: hubCategory, type: 'voice'});
	var loungeVoiceChannel3 = await guild.channels.create('lounge-voice-3', {parent: hubCategory, type: 'voice'});
	var loungeVoiceChannel4 = await guild.channels.create('lounge-voice-4', {parent: hubCategory, type: 'voice'});


	//Make a lounge for coaches to talk to each other
	var coachesLoungeCategory = await guild.channels.create('Coaches Lounge', {type: 'category'});
	await coachesLoungeCategory.updateOverwrite(guild.roles.everyone, {
		'VIEW_CHANNEL': false
	});
	await coachesLoungeCategory.updateOverwrite(staffRole, {
		'VIEW_CHANNEL': true
	});
	await coachesLoungeCategory.updateOverwrite(coachRole, {
		'VIEW_CHANNEL': true
	});
	var coachChannel = await guild.channels.create('coaches-text', {parent: coachesLoungeCategory});
	var coachVoiceChannel1 = await guild.channels.create('coaches-voice-1', {parent: coachesLoungeCategory, type: 'voice'});
	var coachVoiceChannel2 = await guild.channels.create('coaches-voice-2', {parent: coachesLoungeCategory, type: 'voice'});
	var coachVoiceChannel3 = await guild.channels.create('coaches-voice-3', {parent: coachesLoungeCategory, type: 'voice'});


  await guild.owner.roles.add(controlRoomRole);
  await guild.setDefaultMessageNotifications('MENTIONS');
  await guild.setSystemChannel(generalChannel);
}

var help = function (channel, sections) {
  sections = sections || ['i', 'c', 'd', 'g', 'n', 'm', 'a', 'r', 't', 'e', 'p', 'w', 'h'];
  var helpMessage = {
		color: '#29bb9c', // same as discord aqua
		title: 'CKB Bot Help',
		description: 'This bot is able to perform initial server setup, create and delete rooms, and add, remove, or transfer teams to and from rooms. It supports both conventional bot-style syntax and natural language-style [NL-style] syntax. Commands acting on existing teams or rooms require you to tag the role of the team you are operating on and/or the text channels representing the rooms you are operating on. Unless otherwise stated, commands can only be run by users with the Control Room or Staff roles. **Multiple commands can be stacked in one message, as long as they are separated by newlines. Add --force to the end of your command to override having to confirm.**',
		fields: []
  };
  for (var section of sections) {
		helpMessage.fields.push(helpSections[section]);
  }
  if (sections.length < 9) {
		helpMessage.description = '';
  }
  channel.send({embed: helpMessage});
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
	await generalChannel.parent.updateOverwrite(role, {
		'VIEW_CHANNEL': true,
		'SEND_MESSAGES': true,
		'CONNECT': true,
		'ADD_REACTIONS': true,
		'READ_MESSAGE_HISTORY': true,
		'SPEAK': true
	});

	//Announcements isn't synced with the hub category, so we need to add visibility
	//announcementsChannel.updateOverwrite(role);
}

var createTeam = async function (guild, name) {
	var color = randomColor();
	var teamRole = await guild.roles.create({
		data: {
			name: name,
			color: color,
			hoist: true,
			mentionable: true,
			position: 1
		}
	});
	var loungeText = await createRoom(guild, name + ' Lounge', true);
	await add(teamRole, loungeText.parent);
	//Overwrite default READ_MESSAGE_HISTORY from add function
	await loungeText.parent.updateOverwrite(teamRole, {
		'READ_MESSAGE_HISTORY': true
	});
	await addToHub(guild, teamRole);

	return name;
}

var massCreateTeams = async function (guild, prefix, startIndex, endIndex) {
  for (var i = startIndex; i <= endIndex; i++) {
		var name = prefix + String(i);
		await createTeam(guild, name);
  }
  return;
}

var setGuildBitrate = async function (bitrate, guild) {
  for (var channel of guild.channels.cache.array()) {
		if (channel.type === 'voice') {
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
		msg.awaitReactions(function (reaction, user) {
	    return reaction.emoji.name === '👍' && user.id === message.author.id;
		}, {time: 6000}).then(function (collected) {
	    if (collected.size === 0) {
				failCallback();
	    } else {
				successCallback();
	    }
		}).catch(console.error);
  });
}

var processCommand = async function (command, message) {

	//These are commands that can be run by anyone
	if (command.indexOf('.w') === 0 && message.channel.name.indexOf("lounge") > -1) {
		//Give them a secret code for their written
		var id1 = message.channel.id;
		var id2 = message.guild.id;
		var val1 = parseInt(id1.substring(id1.length-6, id1.length));
		var val2 = parseInt(id2.substring(id2.length-6, id2.length));


		//message.channel.send('Channel ID:' + message.channel.id);
		//message.channel.send('Guild ID:' + message.guild.id);

		//message.channel.send('Channel ID truncated: ' + val1);
		//message.channel.send('Guild ID truncated: ' + val2);

		var date1 = new Date("01/01/2000");
		var today = new Date();
		var difference_in_time = today.getTime() - date1.getTime();
		var difference_in_days = parseInt(difference_in_time / (1000*3600*24));
		//message.channel.send('Today num: ' + difference_in_days);

		//message.channel.send('Combined num: ' + (val1 + val2 + difference_in_days));

		var code = ((val1 + val2 + difference_in_days) % 10000 + "").padStart(4, "0");


		message.channel.send('Hello ' + message.channel.name + "! Your secret code for today's written is " + code);

	} else if(hasRole(message.member, 'Control Room') || hasRole(message.member, 'Staff') || message.member === message.channel.guild.owner) {

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
				var role = roles[0];
				var channels = mentions.channels;
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
				if(role.position >= pos) {
					message.channel.send('Cannot add with non-team role ' + role.toString());
					throw 'Cannot add with non-team role ' + role.toString();
				}
				confirm(message, 'Are you sure you want to add team ' + role.toString() + ' to room "' + to.name + '"? Confirm by reacting with \:thumbsup:.', force, function () {
					message.channel.send('No confirmation was received. The addition is cancelled.');
				}, function () {
					add(role, to).then(function () {
						message.channel.send('Team ' + role.toString() + ' has been added to room "' + to.name + '."');
					}).catch(function (error) {
						console.error(error);
						help(message.channel, ['a']);
					});
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
					if(channels[i].parent.children.array().length != 2) {
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
		} else if (command.indexOf('.i') === 0 && message.member === message.channel.guild.owner) {
			confirm(message, 'Are you sure you want to initialize the server? Every channel and role currently in the server will be deleted. Confirm by reacting with \:thumbsup:.', force, function () {
				message.channel.send('No confirmation was received. The initialization is cancelled.');
			}, function () {
				init(message.channel.guild, message.channel).catch(function () {
					help(message.channel, ['i']);
				});
			});
		} else if (command.indexOf('.c') === 0 && hasRole(message.member, 'Control Room')) {
			try {
				var content = command.substr(command.indexOf(' ') + 1).trim();
				var names = content.split(/["“”]/g);
				if (names.length < 2) {
					help(message.channel, ['c']);
					return;
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
				var role = roles[0];
				var pos = await coachPosition(message.guild);
				if(pos < 0) {
					message.channel.send('The Coach role has been deleted.  There must be a Coach role directly above the team roles.');
					throw 'Coach role deleted';
				}
				if(role.position >= pos) {
					message.channel.send('Cannot change color of non-team role ' + role.toString());
					throw 'Cannot paint with non-team role ' + role.toString();
				}
				confirm(message, 'Are you sure you want to paint the specified team a new color? Confirm by reacting with \:thumbsup:.', force, function () {
					message.channel.send('No confirmation was received.  The painting is canceled.');
				}, function () {
					recolor(role).then(function () {
						message.channel.send('Team ' + role.toString() + ' has been given a new color."');
					}).catch(function (error) {
						console.error(error);
						help(message.channel, ['p']);
					});
				});
			} catch (e) {
				console.error(e);
				help(message.channel, ['p']);
			}
		} else if (command.indexOf('.d') === 0 && hasRole(message.member, 'Control Room')) {
			try {
				var channels = mentions.channels;
				//check that they all look like competition rooms
				for(var i=0; i<channels.length; i++) {
					if(channels[i].parent.children.array().length != 2) {
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
					help(message.channel, ['g', 'n', 'm']);
					return;
				}
				confirm(message, 'Are you sure you want to create the team[s] ' + content + '? Confirm by reacting with \:thumbsup:.', force, function () {
					message.channel.send('No confirmation was received. The creation is cancelled.');
				}, function () {
					for (var i = 1; i < names.length; i += 2) {
						var name = names[i];
						createTeam(message.channel.guild, name).then(function (teamName) {
							message.channel.send('Team "' + teamName + '" has been created.');
						}).catch(function (error) {
							console.error(error);
							message.channel.send('Team "' + name + '" could not be created. Please try using a different name.');
							help(message.channel, ['g', 'n', 'm']);
						});
					}
				});
			} catch (e) {
				console.error(e);
				help(message.channel, ['g', 'n', 'm']);
			}
		} else if (command.indexOf('.m') === 0 && hasRole(message.member, 'Control Room')) {
			try {
				/*
					var spaceIndex = command.trim().indexOf(' ');
					if (spaceIndex === -1) {
					throw 'No range provided to .m, sending help dialog to channel.';
					}
					var range = command.substr(spaceIndex + 1).trim();
				*/
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
						help(message.channel, ['g', 'n', 'm']);
					});
				});
			} catch (e) {
				console.error(e);
				help(message.channel, ['g', 'n', 'm']);
			}
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
		} else if (command.indexOf('.h') === 0) {
			help(message.channel);
		} else if (command.indexOf('.') === 0 && (hasRole(message.member, 'Control Room') || hasRole(message.member, 'Staff'))) {
			message.channel.send('Use the `.help` command to get started!');
		}
	}
  return;
};

client.on('message', async function (message) {
	var content = message.content.split('\n');
	for (var str of content) {
		await processCommand(str, message);
	}
  return;
});

client.login(config.BOT_TOKEN);
client.on('ready', function () {
  for (var guild of client.guilds.cache.array()) {
		try {
			console.log(guild.name + ' ' + guild.owner.user.tag);
		} catch (e) {
			console.log(guild.name);
		}
  }
  client.user.setActivity('.help', {type: 'LISTENING'}).then(function () {
		console.log('up and running!');
  }).catch(console.error);
});
