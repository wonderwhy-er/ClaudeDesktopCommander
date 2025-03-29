import { homedir, platform } from 'os';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exec } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine OS and set appropriate config path and command
const isWindows = platform() === 'win32';
const claudeConfigPath = isWindows
    ? join(process.env.APPDATA, 'Claude', 'claude_desktop_config.json')
    : join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');

// Setup logging
const LOG_FILE = join(__dirname, 'setup.log');




function logToFile(message, isError = false) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${isError ? 'ERROR: ' : ''}${message}\n`;
    try {
        appendFileSync(LOG_FILE, logMessage);
        // For setup script, we'll still output to console but in JSON format
        const jsonOutput = {
            type: isError ? 'error' : 'info',
            timestamp,
            message
        };
        process.stdout.write(JSON.stringify(jsonOutput) + '\n');
    } catch (err) {
        // Last resort error handling
        process.stderr.write(JSON.stringify({
            type: 'error',
            timestamp: new Date().toISOString(),
            message: `Failed to write to log file: ${err.message}`
        }) + '\n');
    }
}

async function execAsync(command) {
    return new Promise((resolve, reject) => {
      // Use PowerShell on Windows for better Unicode support and consistency
      const actualCommand = isWindows
      ? `cmd.exe /c ${command}` 
      : command;
        
      exec(actualCommand, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({ stdout, stderr });
      });
    });
}

async function restartClaude() {
	try {
        const platform = process.platform
        switch (platform) {
            case "win32":
                // ignore errors on windows when claude is not running.
                // just silently kill the process
                try  {
                    await execAsync(
                        `taskkill /F /IM "Claude.exe"`,
                    )
                } catch {}
                break;
            case "darwin":
                await execAsync(
                    `killall "Claude"`,
                )
                break;
            case "linux":
                await execAsync(
                    `pkill -f "claude"`,
                )
                break;
        }
		await new Promise((resolve) => setTimeout(resolve, 3000))

		if (platform === "win32") {
            // it will never start claude
			// await execAsync(`start "" "Claude.exe"`)
		} else if (platform === "darwin") {
			await execAsync(`open -a "Claude"`)
		} else if (platform === "linux") {
			await execAsync(`claude`)
		}

		logToFile(`Claude has been restarted.`)
	} catch (error) {
		logToFile(`Failed to restart Claude: ${error}`, true)
	}
}

// Check if config file exists and create default if not
if (!existsSync(claudeConfigPath)) {
    logToFile(`Claude config file not found at: ${claudeConfigPath}`);
    logToFile('Creating default config file...');
    
    // Create the directory if it doesn't exist
    const configDir = dirname(claudeConfigPath);
    if (!existsSync(configDir)) {
        import('fs').then(fs => fs.mkdirSync(configDir, { recursive: true }));
    }
    
    // Create default config
    const defaultConfig = {
        "serverConfig": isWindows
            ? {
                "command": "cmd.exe",
                "args": ["/c"]
              }
            : {
                "command": "/bin/sh",
                "args": ["-c"]
              }
    };
    
    writeFileSync(claudeConfigPath, JSON.stringify(defaultConfig, null, 2));
    logToFile('Default config file created. Please update it with your Claude API credentials.');
}

try {
    // Read existing config
    const configData = readFileSync(claudeConfigPath, 'utf8');
    const config = JSON.parse(configData);

    // Prepare the new server config based on OS
    // Determine if running through npx or locally
    const isNpx = import.meta.url.endsWith('dist/setup-claude-server.js');

    const serverConfig = isNpx ? {
        "command": "npx",
        "args": [
            "@wonderwhy-er/desktop-commander"
        ]
    } : {
        "command": "node",
        "args": [
            join(__dirname, 'dist', 'index.js')
        ]
    };

    // Initialize mcpServers if it doesn't exist
    if (!config.mcpServers) {
        config.mcpServers = {};
    }
    
    // Check if the old "desktopCommander" exists and remove it
    if (config.mcpServers.desktopCommander) {
        logToFile('Found old "desktopCommander" installation. Removing it...');
        delete config.mcpServers.desktopCommander;
    }
    
    // Add or update the terminal server config with the proper name "desktop-commander"
    config.mcpServers["desktop-commander"] = serverConfig;

    // Write the updated config back
    writeFileSync(claudeConfigPath, JSON.stringify(config, null, 2), 'utf8');
    
    logToFile('Successfully added MCP server to Claude configuration!');
    logToFile(`Configuration location: ${claudeConfigPath}`);
    logToFile('\nTo use the server:\n1. Restart Claude if it\'s currently running\n2. The server will be available as "desktop-commander" in Claude\'s MCP server list');
    
    await restartClaude();

} catch (error) {
    logToFile(`Error updating Claude configuration: ${error}`, true);
    process.exit(1);
}