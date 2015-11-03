#!/bin/bash

rm -rf build
mkdir build
$(npm bin)/tsc --outDir build
cp -r build/src build/package
cp package.json build/package/
cp README.md build/package