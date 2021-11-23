#!/bin/sh

ScriptDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

ChromeZipFileName=nvis-chrome-extension.zip
FirefoxZipFileName=nvis-firefox-extension.zip

pushd ${ScriptDir}/.. > /dev/null

echo "Creating '${ChromeZipFileName}'"
rm -f ${ChromeZipFileName}
#powershell Compress-Archive -CompressionLevel "Optimal" -Path "extensions/index.html,extensions/chrome/manifest.json,glsl,extensions/icons,js/nvis.js,extensions/chrome/content.js" -DestinationPath $chromeZipFileName -Force
zip.exe -q -9 -j ${ChromeZipFileName} js/nvis.js
zip.exe -q -9 -r ${ChromeZipFileName} glsl/*.*
pushd extensions > /dev/null
zip.exe -q -9 ../${ChromeZipFileName} loadShaders.js
zip.exe -q -9 -r ../${ChromeZipFileName} icons/*.* 
zip.exe -q -9 ../${ChromeZipFileName} index.html
pushd chrome > /dev/null
zip.exe -q -9 ../../${ChromeZipFileName} manifest.json
zip.exe -q -9 ../../${ChromeZipFileName} content.js
popd > /dev/null
popd > /dev/null

echo "Creating '${FirefoxZipFileName}'"
rm -f ${FirefoxZipFileName}
#powershell Compress-Archive -CompressionLevel "Optimal" -Path "extensions/index.html,extensions/firefox/manifest.json,glsl/,extensions/icons/,js/nvis.js,extensions/firefox/content.js" -DestinationPath $firefoxZipFileName -Force
zip.exe -q -9 -j ${FirefoxZipFileName} js/nvis.js
zip.exe -q -9 -r ${FirefoxZipFileName} glsl/*.*
pushd extensions > /dev/null
zip.exe -q -9 ../${FirefoxZipFileName} loadShaders.js
zip.exe -q -9 -r ../${FirefoxZipFileName} icons/*.* 
zip.exe -q -9 ../${FirefoxZipFileName} index.html
pushd firefox > /dev/null
zip.exe -q -9 ../../${FirefoxZipFileName} manifest.json
zip.exe -q -9 ../../${FirefoxZipFileName} content.js
popd > /dev/null
popd > /dev/null
