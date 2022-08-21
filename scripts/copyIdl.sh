#!/bin/bash

folders="./paperhand_ui/src/target"

for targetfolder in $folders; do
    rm -rf "${targetfolder}"
    cp -rf target "${targetfolder}"
done
