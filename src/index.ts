#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { server } from './server.js';
import { commandManager } from './command-manager.js';
import { configManager } from './config-manager.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runSetup() {
  const setupScript = join(__dirname, 'setup-claude-server.js');
  const { default: setupModule } = await import(setupScript);
  if (typeof setupModule === 'function') {
    await setupModule();
  }
}

async function runServer() {
  try {
    console.error("Starting ClaudeServerCommander...");
    
    // Check if first argument is "setup"
    if (process.argv[2] === 'setup') {
      await runSetup();
      return;
    }
    
    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`UNCAUGHT EXCEPTION: ${errorMessage}`);
      console.error(error instanceof Error && error.stack ? error.stack : 'No stack trace available');
      process.exit(1);
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', async (reason) => {
      const errorMessage = reason instanceof Error ? reason.message : String(reason);
      console.error(`UNHANDLED REJECTION: ${errorMessage}`);
      console.error(reason instanceof Error && reason.stack ? reason.stack : 'No stack trace available');
      process.exit(1);
    });

    console.error("Creating transport...");
    const transport = new StdioServerTransport();
    console.error("Transport created successfully");
    
    try {
      console.error("Loading configuration...");
      await configManager.loadConfig();
      console.error("Configuration loaded successfully");
    } catch (configError) {
      console.error(`Failed to load configuration: ${configError instanceof Error ? configError.message : String(configError)}`);
      console.error(configError instanceof Error && configError.stack ? configError.stack : 'No stack trace available');
      console.error("Continuing with in-memory configuration only");
      // Continue anyway - we'll use an in-memory config
    }
    
    try {
      console.error("Loading blocked commands...");
      await commandManager.loadBlockedCommands();
      console.error("Blocked commands loaded successfully");
    } catch (cmdError) {
      console.error(`Failed to load blocked commands: ${cmdError instanceof Error ? cmdError.message : String(cmdError)}`);
      console.error(cmdError instanceof Error && cmdError.stack ? cmdError.stack : 'No stack trace available');
    }

    console.error("Connecting server...");
    await server.connect(transport);
    console.error("Server connected successfully");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`FATAL ERROR: ${errorMessage}`);
    console.error(error instanceof Error && error.stack ? error.stack : 'No stack trace available');
    process.stderr.write(JSON.stringify({
      type: 'error',
      timestamp: new Date().toISOString(),
      message: `Failed to start server: ${errorMessage}`
    }) + '\n');
    process.exit(1);
  }
}

runServer().catch(async (error) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`RUNTIME ERROR: ${errorMessage}`);
  console.error(error instanceof Error && error.stack ? error.stack : 'No stack trace available');
  process.stderr.write(JSON.stringify({
    type: 'error',
    timestamp: new Date().toISOString(),
    message: `Fatal error running server: ${errorMessage}`
  }) + '\n');
  process.exit(1);
});