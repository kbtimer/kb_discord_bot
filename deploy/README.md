# Hosting CKB Bot on a DigitalOcean droplet

The bot runs as a systemd service (`ckbbot`) from `/opt/ckbbot`, under its own
unprivileged `ckbbot` user. It only makes outbound connections to Discord, so
no ports need to be opened besides SSH.

**Only one copy of the bot may run per token.** While the droplet is running,
don't start `node tournament.js` on another machine with the same `config.json`:
both copies would act on every command. Stop the service first
(`systemctl stop ckbbot`), or use a separate test bot with its own token.

## 1. Push your code

The droplet clones from GitHub, so push `master` first:

```bash
git push origin master
```

## 2. Create the droplet

In the DigitalOcean control panel → Create → Droplets:

- **Region:** New York (closest to Discord's API)
- **Image:** Ubuntu, latest LTS
- **Size:** Basic → Regular → 1 GB RAM (~$6/month)
- **Authentication:** SSH key (add `~/.ssh/id_ed25519.pub` or similar)

Note the droplet's IP address. Below, replace `DROPLET_IP` with it.

## 3. Install Node and the bot

```bash
ssh root@DROPLET_IP
```

Then, on the droplet:

```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt install -y nodejs git
node --version                       # must be 18 or newer

ufw allow OpenSSH && ufw --force enable

useradd --system --create-home --shell /usr/sbin/nologin ckbbot
git clone https://github.com/kbtimer/kb_discord_bot.git /opt/ckbbot
chown -R ckbbot: /opt/ckbbot
cd /opt/ckbbot && sudo -u ckbbot -H npm install --omit=dev
```

## 4. Copy the token

From your Mac, in this repo:

```bash
scp config.json root@DROPLET_IP:/opt/ckbbot/config.json
ssh root@DROPLET_IP 'chown ckbbot: /opt/ckbbot/config.json && chmod 600 /opt/ckbbot/config.json'
```

## 5. Start the service

Stop any local copy of the bot, then on the droplet:

```bash
cp /opt/ckbbot/deploy/ckbbot.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now ckbbot
journalctl -u ckbbot -f              # watch the log; Ctrl-C to stop watching
```

`enable` makes it start again after a reboot; `Restart=always` restarts it
10 seconds after a crash.

## 6. Test it

Run the `testing.txt` sequence against a throwaway server (not the Demo
Server). To see timings, run the bot in the foreground with profiling instead
of as a service:

```bash
systemctl stop ckbbot
cd /opt/ckbbot && sudo -u ckbbot -H env PROFILE=1 node tournament.js
# ... run the test round, then Ctrl-C
systemctl start ckbbot
```

## Day-to-day

| Task | Command |
| --- | --- |
| Deploy new code (after `git push`) | `ssh root@DROPLET_IP /opt/ckbbot/deploy/update.sh` |
| Watch the log | `ssh root@DROPLET_IP journalctl -u ckbbot -f` |
| Restart / stop / start | `ssh root@DROPLET_IP systemctl restart ckbbot` (or `stop`, `start`) |
| Fetch the member update log | `scp root@DROPLET_IP:/opt/ckbbot/MemberUpdateLog.txt .` |

If you change `deploy/ckbbot.service`, `update.sh` won't install it: repeat the
`cp` and `systemctl daemon-reload` from step 5.

## After the last tournament

1. Fetch `MemberUpdateLog.txt` if you want it.
2. Destroy the droplet (Droplet → Destroy). A powered-off droplet is still billed;
   only destroying it stops the charges.
