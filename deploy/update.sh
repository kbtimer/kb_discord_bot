#!/bin/sh
# Run on the droplet as root: pull the latest master, install dependencies, restart the bot.
set -e
cd /opt/ckbbot
sudo -u ckbbot -H git pull --ff-only
sudo -u ckbbot -H npm ci --omit=dev --ignore-scripts
systemctl restart ckbbot
sleep 3
journalctl -u ckbbot -n 20 --no-pager
