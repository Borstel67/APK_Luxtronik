#!/bin/bash
# Builds the APK without Gradle/SDK manager: aapt2 + javac + dx + zipalign(py) + apk_sign_ts
set -e
cd "$(dirname "$0")"
T=~/tools
AAPT2=$T/node_modules/aaptjs3/bin/x64/linux/aapt2
AJAR=$T/android.jar
DXJAR=$(ls $T/d2j/dex-tools-*/lib/dx-*.jar)
rm -rf build && mkdir -p build/classes build/gen

python3 tools/build_web.py
$AAPT2 compile --dir res -o build/res.zip
$AAPT2 link -I "$AJAR" --manifest AndroidManifest.xml -A assets \
  --java build/gen -o build/base.apk build/res.zip --no-compress-regex '.*\.arsc'

javac -nowarn -source 8 -target 8 -bootclasspath "$AJAR" -d build/classes \
  $(find src build/gen -name '*.java') 2>&1 | grep -v -E 'JAVA_TOOL|warning|^[0-9]+ warning' || true
java -cp "$DXJAR" com.android.dx.command.Main --dex --min-sdk-version=26 \
  --output=build/classes.dex build/classes 2>&1 | grep -v JAVA_TOOL || true

python3 tools_zip.py build/base.apk build/classes.dex build/aligned.apk
node sign.mjs build/aligned.apk build/Waermepumpe.apk
ls -la build/Waermepumpe.apk
