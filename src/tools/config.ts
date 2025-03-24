import { z } from 'zod';
import { configManager, ServerConfig } from '../config-manager.js';

// Schemas for config operations
export const GetConfigArgsSchema = z.object({});

export const GetConfigValueArgsSchema = z.object({
  key: z.string(),
});

export const SetConfigValueArgsSchema = z.object({
  key: z.string(),
  value: z.any(),
});

export const UpdateConfigArgsSchema = z.object({
  config: z.record(z.any()),
});

/**
 * Get the entire config
 */
export async function getConfig() {
  console.error('getConfig called');
  try {
    const config = await configManager.getConfig();
    console.error(`getConfig result: ${JSON.stringify(config, null, 2)}`);
    return {
      content: [{
        type: "text",
        text: `Current configuration:\n${JSON.stringify(config, null, 2)}`
      }],
    };
  } catch (error) {
    console.error(`Error in getConfig: ${error instanceof Error ? error.message : String(error)}`);
    console.error(error instanceof Error && error.stack ? error.stack : 'No stack trace available');
    // Return empty config rather than crashing
    return {
      content: [{
        type: "text",
        text: `Error getting configuration: ${error instanceof Error ? error.message : String(error)}\nUsing empty configuration.`
      }],
    };
  }
}

/**
 * Get a specific config value
 */
export async function getConfigValue(args: unknown) {
  console.error(`getConfigValue called with args: ${JSON.stringify(args)}`);
  try {
    const parsed = GetConfigValueArgsSchema.safeParse(args);
    if (!parsed.success) {
      console.error(`Invalid arguments for get_config_value: ${parsed.error}`);
      return {
        content: [{
          type: "text",
          text: `Invalid arguments: ${parsed.error}`
        }],
        isError: true
      };
    }

    const value = await configManager.getValue(parsed.data.key);
    console.error(`getConfigValue result for key ${parsed.data.key}: ${JSON.stringify(value)}`);
    return {
      content: [{
        type: "text",
        text: value !== undefined
          ? `Value for ${parsed.data.key}: ${JSON.stringify(value, null, 2)}`
          : `No value found for key: ${parsed.data.key}`
      }],
    };
  } catch (error) {
    console.error(`Error in getConfigValue: ${error instanceof Error ? error.message : String(error)}`);
    console.error(error instanceof Error && error.stack ? error.stack : 'No stack trace available');
    return {
      content: [{
        type: "text",
        text: `Error retrieving value: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

/**
 * Set a specific config value
 */
export async function setConfigValue(args: unknown) {
  console.error(`setConfigValue called with args: ${JSON.stringify(args)}`);
  try {
    const parsed = SetConfigValueArgsSchema.safeParse(args);
    if (!parsed.success) {
      console.error(`Invalid arguments for set_config_value: ${parsed.error}`);
      return {
        content: [{
          type: "text",
          text: `Invalid arguments: ${parsed.error}`
        }],
        isError: true
      };
    }

    try {
      await configManager.setValue(parsed.data.key, parsed.data.value);
      console.error(`setConfigValue: Successfully set ${parsed.data.key} to ${JSON.stringify(parsed.data.value)}`);
      return {
        content: [{
          type: "text",
          text: `Successfully set ${parsed.data.key} to ${JSON.stringify(parsed.data.value, null, 2)}`
        }],
      };
    } catch (saveError: any) {
      console.error(`Error saving config: ${saveError.message}`);
      // Continue with in-memory change but report error
      return {
        content: [{
          type: "text", 
          text: `Value changed in memory but couldn't be saved to disk: ${saveError.message}`
        }],
        isError: true
      };
    }
  } catch (error) {
    console.error(`Error in setConfigValue: ${error instanceof Error ? error.message : String(error)}`);
    console.error(error instanceof Error && error.stack ? error.stack : 'No stack trace available');
    return {
      content: [{
        type: "text",
        text: `Error setting value: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

/**
 * Update multiple config values at once
 */
export async function updateConfig(args: unknown) {
  console.error(`updateConfig called with args: ${JSON.stringify(args)}`);
  try {
    const parsed = UpdateConfigArgsSchema.safeParse(args);
    if (!parsed.success) {
      console.error(`Invalid arguments for update_config: ${parsed.error}`);
      return {
        content: [{
          type: "text",
          text: `Invalid arguments: ${parsed.error}`
        }],
        isError: true
      };
    }

    try {
      const updatedConfig = await configManager.updateConfig(parsed.data.config);
      console.error(`updateConfig result: ${JSON.stringify(updatedConfig, null, 2)}`);
      return {
        content: [{
          type: "text",
          text: `Configuration updated successfully.\nNew configuration:\n${JSON.stringify(updatedConfig, null, 2)}`
        }],
      };
    } catch (saveError: any) {
      console.error(`Error saving updated config: ${saveError.message}`);
      // Return useful response instead of crashing
      return {
        content: [{
          type: "text",
          text: `Configuration updated in memory but couldn't be saved to disk: ${saveError.message}`
        }],
        isError: true
      };
    }
  } catch (error) {
    console.error(`Error in updateConfig: ${error instanceof Error ? error.message : String(error)}`);
    console.error(error instanceof Error && error.stack ? error.stack : 'No stack trace available');
    return {
      content: [{
        type: "text",
        text: `Error updating configuration: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}