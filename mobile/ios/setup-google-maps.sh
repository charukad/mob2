#!/bin/bash

# Check if node_modules/react-native-maps/ios/AirGoogleMaps exists
if [ ! -d "../node_modules/react-native-maps/ios/AirGoogleMaps" ]; then
  echo "AirGoogleMaps directory not found in node_modules/react-native-maps/ios"
  exit 1
fi

# Copy AirGoogleMaps dir to Xcode project
echo "Copying AirGoogleMaps directory to iOS project..."
cp -R "../node_modules/react-native-maps/ios/AirGoogleMaps" "./SriLankaTourismGuide/"

# Modify Podfile if needed
if ! grep -q "rn_maps_path = '../node_modules/react-native-maps'" "./Podfile"; then
  echo "Updating Podfile..."
  sed -i '' '1s/^/rn_maps_path = "'\''\.\.\\/node_modules\\/react-native-maps'\'\'"\n/' "./Podfile"
fi

echo "AirGoogleMaps setup complete. Please open Xcode and:"
echo "1. Drag the AirGoogleMaps folder from Finder to the SriLankaTourismGuide project in Xcode"
echo "2. Select 'Create folder references' when prompted"
echo "3. Make sure 'Copy items if needed' is NOT checked"
echo "4. Build and run your project" 