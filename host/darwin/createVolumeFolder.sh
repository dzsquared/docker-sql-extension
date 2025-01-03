#!/bin/bash

containerName=$1

homeDir=$(eval echo ~$USER)
volumeDirectory="$homeDir/.sqlcontainers"

if [ ! -d "$volumeDirectory" ]; then
    mkdir -p "$volumeDirectory"
fi

timestamp=$(date +"%Y%m%d%H%M%S")
volumeName="${containerName}_${timestamp}"

containerDirectory="$volumeDirectory/$volumeName"

if [ ! -d "$containerDirectory" ]; then
    mkdir -p "$containerDirectory"
fi

echo $containerDirectory