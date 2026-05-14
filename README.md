# 🏗️ nexus-satisfactory-layout-tool - Plan efficient factory designs with ease

[![](https://img.shields.io/badge/Download-Release_Page-blue.svg)](https://github.com/abhishekalway6686/nexus-satisfactory-layout-tool)

This tool helps players plan complex factory layouts for the game Satisfactory. It features a high-performance interface to place machines, conveyors, pipes, railways, and power lines. You can simulate production rates and optimize your floor space before you build in the game.

## 📥 Getting Started

To use the nexus-satisfactory-layout-tool, follow these instructions to download and run the software on your Windows computer.

1. Go to the [official release page](https://github.com/abhishekalway6686/nexus-satisfactory-layout-tool).
2. Look for the latest version listed under the Releases section.
3. Find the file ending in `.msi` or `.exe` designed for Windows.
4. Click the file to start your download.
5. Once the download finishes, find the file in your Downloads folder.
6. Double-click the file to begin the installation.
7. Follow the prompts on your screen to complete the setup process.
8. Locate the new icon on your desktop or in your Start menu to open the application.

## 🛠️ System Requirements

Before you install the tool, ensure your computer meets these basic requirements:

* Operating System: Windows 10 or Windows 11.
* Memory: 4GB of RAM or more.
* Storage: 200MB of free disk space.
* Graphics: Any modern integrated or dedicated graphics card.
* Display: A resolution of 1920x1080 is recommended for the best view of your factory layout.

## 🗺️ How to Plan a Factory

The workspace provides a blank canvas to draft your factory floors. Use the toolbar on the left side of the screen to select items. 

### Placing Machines
Click on an icon to select a machine, such as a Miner or Smelter. Click again on the grid to place the machine. You can drag machines to move them or use the rotate button to change their orientation.

### Connecting Assets
Connect machines using the conveyor or pipe tools. Click on an output port of one machine and drag the line to the input port of another. The tool highlights invalid connections in red and valid connections in green.

### Managing Power
Select the power line tool to connect machines to a central power grid. The tool tracks your total energy consumption and warns you if your total machine needs exceed the capacity of your power generators.

## 📊 Using the Simulation Mode

You can check if your factory runs at full efficiency using the simulation tab. 

1. Select the top ribbon menu.
2. Click on the Simulation icon.
3. Review the summary panel on the right.
4. Look for items marked with an alert icon. An alert usually means you lack a specific resource or a belt speed limits your capacity.

## 🔧 Frequently Asked Questions

What should I do if the app does not open?
Check if you have the latest drivers for your graphics card. Try a clean installation by removing the app and installing it again.

Can I save my layouts?
Yes. Click the File menu at the top left corner and select Save. You can name your layout and store it anywhere on your computer for later edits.

Does this tool interact with my game save files?
No. The tool serves as a planning aid and exists separately from your game files. You must build the designs in Satisfactory manually.

Can I export my designs as images?
Yes. Use the Export button in the File menu to save your layout as a high-quality image file. This helps you share your plans with friends or keep them for reference while you play.

## 📜 Technical Details

This software uses the Tauri framework and Rust to ensure high performance on your desktop. It provides a smooth experience even when you create massive factory blueprints with hundreds of machines. The codebase follows the AGPL-3.0 license. This ensures the tool remains free to use and open for modification. As a user, you get a tool that performs well because it uses your computer hardware resources directly rather than relying on a heavy web browser interface.