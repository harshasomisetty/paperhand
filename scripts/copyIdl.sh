#!/bin/bash

folders="./nftamm_ui/src/target ./paperhand_ui/src/target"

for targetfolder in $folders; do
    rm -rf "${targetfolder}"
    cp -rf target "${targetfolder}"
done
