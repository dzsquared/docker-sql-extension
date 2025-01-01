#!/bin/bash

curl -o /usr/bin/ttyd -L https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.aarch64
chmod +x /usr/bin/ttyd

curl -o /tmp/sqlcmd-linux-arm64.tar.bz2 -L https://github.com/microsoft/go-sqlcmd/releases/download/v1.8.2/sqlcmd-linux-arm64.tar.bz2
mkdir /tmp/sqlcmd
tar -xvf /tmp/sqlcmd-linux-arm64.tar.bz2 -C /tmp/sqlcmd
cp /tmp/sqlcmd/sqlcmd /usr/bin/sqlcmd
chmod +x /usr/bin/sqlcmd
rm -rf /tmp/sqlcmd
