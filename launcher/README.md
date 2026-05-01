# Satisfactory Layout Tool - Launcher

This launcher provides a user-friendly way to start the Satisfactory Layout Tool without any command-line knowledge.

## What It Does

1. **Starts the backend server** automatically
2. **Waits** for the server to be ready
3. **Opens your browser** to the app
4. **Handles shutdown** cleanly when you close the window

## For Users

Just double-click `SatisfactoryLayoutTool.exe` - that's it!

The app will open in your default browser. Keep the launcher window open while using the app.

## For Developers

### Building the Launcher

```bash
cd launcher
npm install
npm run build:windows    # Creates dist/SatisfactoryLayoutTool.exe
```

### Creating a Distribution Package

1. Build the frontend:
   ```bash
   npm run build
   ```

2. Build the Rust backend:
   ```bash
   npm run rust:build
   ```

3. Build the launcher:
   ```bash
   cd launcher
   npm run build:windows
   ```

4. Create distribution folder with:
   ```
   SatisfactoryLayoutTool/
   ├── SatisfactoryLayoutTool.exe    (from launcher/dist/)
   ├── standalone-server.exe          (from src-tauri/target/release/)
   └── dist/                          (frontend build folder)
   ```

5. Zip and distribute!

### Requirements for Building

- Node.js 18+
- `pkg` package (installed via npm install)

## Troubleshooting

### "Server failed to start"
- Make sure `standalone-server.exe` is in the same folder as the launcher
- Check if port 5175 (backend) or 5173 (frontend) is already in use

### Browser doesn't open
- The frontend app is running at http://127.0.0.1:5173
- The backend API is running at http://127.0.0.1:5175
- Open http://127.0.0.1:5173 manually in your browser

### App closes immediately
- Keep the launcher window open while using the app
- Closing the launcher window stops the server
