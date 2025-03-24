import fs from 'fs/promises';
import path from 'path';
import { CONFIG_FILE } from './config.js';
import * as process from 'process';
import os from 'os';

/**
 * Interface for the server configuration
 */
export interface ServerConfig {
  blockedCommands?: string[];
  defaultShell?: string;
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
  allowedDirectories?: string[];
  [key: string]: any; // Allow for arbitrary configuration keys
}

/**
 * Manages reading and writing server configuration
 */
export class ConfigManager {
  private config: ServerConfig = {};
  private initialized: boolean = false;

  /**
   * Load configuration from disk
   */
  async loadConfig(): Promise<ServerConfig> {
    try {
      console.error(`Loading config from ${CONFIG_FILE}...`);
      console.error(`Current working directory: ${process.cwd()}`);
      console.error(`Absolute config path: ${path.resolve(CONFIG_FILE)}`);
      
      // Ensure config directory exists
      const configDir = path.dirname(CONFIG_FILE);
      try {
        console.error(`Ensuring config directory exists: ${configDir}`);
        await fs.mkdir(configDir, { recursive: true });
        console.error(`Config directory ready: ${configDir}`);
      } catch (mkdirError: any) {
        console.error(`Error creating config directory: ${mkdirError.message}`);
        // Continue if directory already exists
        if (mkdirError.code !== 'EEXIST') {
          throw mkdirError;
        }
      }

      // Check if the directory exists and is writable
      try {
        const dirStats = await fs.stat(configDir);
        console.error(`Config directory exists: ${dirStats.isDirectory()}`);
        
        await fs.access(configDir, fs.constants.W_OK);
        console.error(`Directory ${configDir} is writable`);
      } catch (dirError: any) {
        console.error(`Config directory check error: ${dirError.message}`);
      }

      // Check file permissions
      try {
        const fileStats = await fs.stat(CONFIG_FILE).catch(() => null);
        if (fileStats) {
          console.error(`Config file exists, permissions: ${fileStats.mode.toString(8)}`);
        } else {
          console.error('Config file does not exist, will create');
        }
      } catch (statError: any) {
        console.error(`Error checking file stats: ${statError.message}`);
      }
      
      let configData;
      
      try {
        configData = await fs.readFile(CONFIG_FILE, 'utf-8');
        console.error(`Config file read successfully, content length: ${configData.length}`);
      } catch (readError: any) {
        console.error(`Error reading config file: ${readError.message}, code: ${readError.code}, stack: ${readError.stack}`);
        if (readError.code === 'ENOENT') {
          console.error('Config file does not exist, will create default');
        } else {
          throw readError;
        }
      }
      
      if (configData) {
        try {
          this.config = JSON.parse(configData);
          console.error(`Config parsed successfully: ${JSON.stringify(this.config, null, 2)}`);
        } catch (parseError: any) {
          console.error(`Failed to parse config JSON: ${parseError.message}`);
          // If file exists but has invalid JSON, use default empty config
          this.config = {};
        }
      } else {
        // If file doesn't exist, use default empty config
        this.config = {};
      }
      
      this.initialized = true;
      
      // Create default config file if it doesn't exist
      if (!configData) {
        console.error('Creating default config file');
        await this.saveConfig();
      }
    } catch (error: any) {
      console.error(`Unexpected error in loadConfig: ${error instanceof Error ? error.message : String(error)}`);
      console.error(error instanceof Error && error.stack ? error.stack : 'No stack trace available');
      // Initialize with empty config
      this.config = {};
      this.initialized = true; // Mark as initialized even with empty config
    }
    return this.config;
  }

  /**
   * Save current configuration to disk
   */
  async saveConfig(): Promise<void> {
    try {
      console.error(`Saving config to ${CONFIG_FILE}...`);
      console.error(`Current working directory: ${process.cwd()}`);
      console.error(`Absolute config path: ${path.resolve(CONFIG_FILE)}`);
      
      // Always try to create the config directory first
      const configDir = path.dirname(CONFIG_FILE);
      try {
        console.error(`Ensuring config directory exists: ${configDir}`);
        await fs.mkdir(configDir, { recursive: true });
        console.error(`Config directory ready: ${configDir}`);
      } catch (mkdirError: any) {
        console.error(`Failed to create directory: ${mkdirError.message}`);
        if (mkdirError.code !== 'EEXIST') {
          throw mkdirError;
        }
      }
      
      // Check directory permissions
      try {
        await fs.access(configDir, fs.constants.W_OK);
        console.error(`Directory ${configDir} is writable`);
      } catch (accessError: any) {
        console.error(`Directory access error: ${accessError.message}`);
        throw new Error(`Config directory is not writable: ${accessError.message}`);
      }
      
      const configJson = JSON.stringify(this.config, null, 2);
      console.error(`Config to save: ${configJson}`);
      
      try {
        // Try to write the file with explicit encoding and permissions
        await fs.writeFile(CONFIG_FILE, configJson, { 
          encoding: 'utf-8', 
          mode: 0o644 // Readable/writable by owner, readable by others
        });
        console.error('Config saved successfully');
      } catch (writeError: any) {
        console.error(`Write file error: ${writeError.message}, code: ${writeError.code}, stack: ${writeError.stack}`);
        throw writeError;
      }
    } catch (error: any) {
      console.error(`Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`);
      console.error(error instanceof Error && error.stack ? error.stack : 'No stack trace available');
      throw new Error(`Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get a specific configuration value
   */
  async getValue<T>(key: string): Promise<T | undefined> {
    if (!this.initialized) {
      console.error(`getValue for key "${key}" - loading config first`);
      await this.loadConfig();
    }
    console.error(`Getting value for key "${key}": ${JSON.stringify(this.config[key])}`);
    return this.config[key] as T;
  }

  /**
   * Set a specific configuration value
   */
  async setValue<T>(key: string, value: T): Promise<void> {
    console.error(`Setting value for key "${key}": ${JSON.stringify(value)}`);
    if (!this.initialized) {
      console.error('setValue - loading config first');
      await this.loadConfig();
    }
    this.config[key] = value;
    await this.saveConfig();
  }

  /**
   * Get the entire configuration object
   */
  async getConfig(): Promise<ServerConfig> {
    if (!this.initialized) {
      console.error('getConfig - loading config first');
      await this.loadConfig();
    }
    console.error(`Getting full config: ${JSON.stringify(this.config, null, 2)}`);
    return { ...this.config }; // Return a copy to prevent untracked mutations
  }

  /**
   * Update multiple configuration values at once
   */
  async updateConfig(partialConfig: Partial<ServerConfig>): Promise<ServerConfig> {
    console.error(`Updating config with: ${JSON.stringify(partialConfig, null, 2)}`);
    if (!this.initialized) {
      console.error('updateConfig - loading config first');
      await this.loadConfig();
    }
    
    this.config = {
      ...this.config,
      ...partialConfig
    };
    
    await this.saveConfig();
    return { ...this.config };
  }
}

// Memory-only version that doesn't try to save to filesystem
class MemoryConfigManager {
  private config: ServerConfig = {};
  private initialized: boolean = true;

  async loadConfig(): Promise<ServerConfig> {
    console.error('Using memory-only configuration (no filesystem operations)');
    return this.config;
  }

  async saveConfig(): Promise<void> {
    console.error('Memory-only configuration - changes will not persist after restart');
    // No-op - we don't save to filesystem
    return;
  }

  async getValue<T>(key: string): Promise<T | undefined> {
    console.error(`Getting memory value for key "${key}": ${JSON.stringify(this.config[key])}`);
    return this.config[key] as T;
  }

  async setValue<T>(key: string, value: T): Promise<void> {
    console.error(`Setting memory value for key "${key}": ${JSON.stringify(value)}`);
    this.config[key] = value;
  }

  async getConfig(): Promise<ServerConfig> {
    console.error(`Getting full memory config: ${JSON.stringify(this.config, null, 2)}`);
    return { ...this.config };
  }

  async updateConfig(partialConfig: Partial<ServerConfig>): Promise<ServerConfig> {
    console.error(`Updating memory config with: ${JSON.stringify(partialConfig, null, 2)}`);
    this.config = {
      ...this.config,
      ...partialConfig
    };
    return { ...this.config };
  }
}

// Export the appropriate manager based on the environment
export const configManager = new ConfigManager();
