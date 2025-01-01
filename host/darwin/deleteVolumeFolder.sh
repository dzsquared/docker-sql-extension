#!/bin/bash

containerDirectory=$1

if [ -d "$containerDirectory" ]; then
    rm -rf "$containerDirectory"
fi