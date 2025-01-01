#!/bin/bash

# takes 3 parameters to be passed to go-sqlcmd
# -S host.docker.internal,1433 -d master -U sa -P Password -C
# 1 = port number (1433)
# 2 = database name (master)
# 3 = password (Password)


/usr/bin/sqlcmd -S host.docker.internal,$1 -d $2 -U sa -P $3 -C
