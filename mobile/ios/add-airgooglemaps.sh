#!/bin/bash

# Define paths
XCODE_PROJ="./SriLankaTourismGuide.xcodeproj"
AIRGOOGLMAPS_SRC="../node_modules/react-native-maps/ios/AirGoogleMaps"
AIRGOOGLMAPS_DEST="./SriLankaTourismGuide/AirGoogleMaps"

# Check if source directory exists
if [ ! -d "$AIRGOOGLMAPS_SRC" ]; then
  echo "❌ Error: AirGoogleMaps source directory not found at $AIRGOOGLMAPS_SRC"
  exit 1
fi

# Create destination directory if it doesn't exist
mkdir -p "$AIRGOOGLMAPS_DEST"

# Copy all files from source to destination
echo "📂 Copying AirGoogleMaps files..."
cp -R "$AIRGOOGLMAPS_SRC/"* "$AIRGOOGLMAPS_DEST/"

# Install PlistBuddy if not installed (homebrew)
if ! command -v /usr/libexec/PlistBuddy &> /dev/null; then
  echo "⚠️ PlistBuddy not found, but it's usually included in macOS."
fi

# Inform user about manual steps needed in Xcode
echo ""
echo "🔨 Now you need to manually add AirGoogleMaps to your Xcode project:"
echo ""
echo "1. Open your Xcode project: open $XCODE_PROJ"
echo "2. In the Project Navigator, right-click on the SriLankaTourismGuide group (folder)"
echo "3. Select 'Add Files to \"SriLankaTourismGuide\"...'"
echo "4. Navigate to $AIRGOOGLMAPS_DEST"
echo "5. Make sure 'Create folder references' is selected (blue folder icon)"
echo "6. Click 'Add'"
echo "7. Clean and rebuild your project"
echo ""
echo "Would you like to open Xcode now? (y/n)"
read answer

if [ "$answer" == "y" ]; then
  open "$XCODE_PROJ"
fi 