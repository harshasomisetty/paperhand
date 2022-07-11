#!/bin/bash

folders="./app/src/target"

for targetfolder in $folders; do
    rm -rf "${targetfolder}"
    cp -rf target "${targetfolder}"
done
