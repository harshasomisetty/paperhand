#!/bin/bash

rm -rf app/src/target
mkdir app/src/target
mkdir app/src/target/idl
mkdir app/src/target/types
cp -a target/types/. app/src/target/types/
cp -a target/idl/. app/src/target/idl/
