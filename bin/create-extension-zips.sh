#!/bin/sh

chromeZipFileName=nvis-chrome-extension.zip
firefoxZipFileName=nvis-firefox-extension.zip

echo "Creating '$chromeZipFileName'."
powershell Compress-Archive -Path "extensions/index.html,extensions/chrome/manifest.json,glsl,extensions/icons,js/nvis.js,extensions/chrome/content.js" -DestinationPath $chromeZipFileName -Force
echo "Creating '$firefoxZipFileName'."
powershell Compress-Archive -Path "extensions/index.html,extensions/firefox/manifest.json,glsl,extensions/icons,js/nvis.js,extensions/firefox/content.js" -DestinationPath $firefoxZipFileName -Force
