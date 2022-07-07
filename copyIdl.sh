#!/bin/bash

folders="app app2/src"

for folder in $folders; do
    target="${folder}/target"
    rm -rf "${target}"
    cp -rf target "${target}"
done
