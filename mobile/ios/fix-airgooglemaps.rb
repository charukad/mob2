#!/usr/bin/env ruby

require 'xcodeproj'

# Path to the Xcode project
project_path = './SriLankaTourismGuide.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Path to AirGoogleMaps directory
air_google_maps_path = './SriLankaTourismGuide/AirGoogleMaps'

# Find the main target
main_target = project.targets.find { |target| target.name == 'SriLankaTourismGuide' }
unless main_target
  puts "❌ Could not find the main target in the project"
  exit 1
end

# Get main group
main_group = project.main_group.find_subpath('SriLankaTourismGuide')
unless main_group
  puts "❌ Could not find the main group in the project"
  exit 1
end

# Check if AirGoogleMaps group already exists
if main_group.find_subpath('AirGoogleMaps')
  puts "✅ AirGoogleMaps group already exists in the project"
else
  # Create AirGoogleMaps group
  puts "Creating AirGoogleMaps group in the project..."
  air_google_maps_group = main_group.new_group('AirGoogleMaps', air_google_maps_path)
  
  # Add all files from the AirGoogleMaps directory to the group
  puts "Adding AirGoogleMaps files to the project..."
  Dir.glob(File.join(air_google_maps_path, '**', '*')).each do |file_path|
    next if File.directory?(file_path)
    next if file_path.end_with?('.md') # Skip README files
    
    # Get the relative path to the file from the AirGoogleMaps directory
    relative_path = file_path.sub(air_google_maps_path + '/', '')
    puts "  Adding #{relative_path}"
    
    # Create any necessary parent groups for the file
    parent_groups = relative_path.split('/')
    file_name = parent_groups.pop
    
    parent_group = air_google_maps_group
    parent_groups.each do |group_name|
      existing_group = parent_group.children.find { |child| child.display_name == group_name && child.isa == 'PBXGroup' }
      parent_group = existing_group || parent_group.new_group(group_name)
    end
    
    # Add the file to the project and target
    file_ref = parent_group.new_file(file_path)
    
    # Add source files to target (only .m, .mm, and .c files)
    if file_path.end_with?('.m', '.mm', '.c')
      main_target.add_file_references([file_ref])
    end
  end
end

# Save the project
project.save

puts "✅ AirGoogleMaps integration complete!"
puts "You may need to run 'pod install' and clean/build your project" 