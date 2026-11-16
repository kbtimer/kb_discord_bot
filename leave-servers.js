// One-off maintenance script: list the servers the bot is in, or make it leave some.
//
//   node leave-servers.js                      list every server (nothing is changed)
//   node leave-servers.js --leave ID ID ...    leave only the listed servers
//   node leave-servers.js --keep ID ID ...     leave every server EXCEPT the listed ones
//
// Leaving and keeping both ask for confirmation before doing anything.
// Stop the main bot (tournament.js) before running this.

const { Client, GatewayIntentBits } = require('discord.js');
const readline = require('readline');
const config = require('./config.json');

const args = process.argv.slice(2);
const mode = args[0];
const ids = new Set(args.slice(1));

if (mode && mode !== '--leave' && mode !== '--keep') {
	console.error('Unknown option ' + mode + '. Use --leave or --keep.');
	process.exit(1);
}
if (mode && ids.size === 0) {
	console.error(mode + ' needs at least one server ID.');
	process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

function ask(question) {
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	return new Promise(resolve => rl.question(question, answer => { rl.close(); resolve(answer); }));
}

client.once('clientReady', async () => {
	try {
		const guilds = [...client.guilds.cache.values()]
			.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);

		if (!mode) {
			console.log('ID                   Bot joined   Members  Name');
			for (const g of guilds) {
				const joined = new Date(g.joinedTimestamp).toISOString().slice(0, 10);
				console.log(g.id.padEnd(20) + ' ' + joined + '   ' + String(g.memberCount).padStart(7) + '  ' + g.name);
			}
			console.log('\n' + guilds.length + ' servers.');
			return;
		}

		const unknown = [...ids].filter(id => !client.guilds.cache.has(id));
		if (unknown.length > 0) {
			console.error('The bot is not in these servers (check the IDs): ' + unknown.join(', '));
			return;
		}

		const toLeave = guilds.filter(g => mode === '--leave' ? ids.has(g.id) : !ids.has(g.id));
		if (toLeave.length === 0) {
			console.log('Nothing to leave.');
			return;
		}

		console.log('The bot will LEAVE these ' + toLeave.length + ' servers:');
		for (const g of toLeave) console.log('  ' + g.id + '  ' + g.name);
		const answer = await ask('\nType "leave" to confirm: ');
		if (answer.trim() !== 'leave') {
			console.log('Cancelled. Nothing was changed.');
			return;
		}

		for (const g of toLeave) {
			try {
				await g.leave();
				console.log('Left  ' + g.name);
			} catch (e) {
				console.error('FAILED to leave ' + g.name + ': ' + e.message);
			}
		}
	} finally {
		client.destroy();
	}
});

client.login(config.BOT_TOKEN);
