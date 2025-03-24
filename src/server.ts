import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { commandManager } from './command-manager.js';
import {
  ExecuteCommandArgsSchema,
  ReadOutputArgsSchema,
  ForceTerminateArgsSchema,
  ListSessionsArgsSchema,
  KillProcessArgsSchema,
  BlockCommandArgsSchema,
  UnblockCommandArgsSchema,
  ReadFileArgsSchema,
  ReadMultipleFilesArgsSchema,
  WriteFileArgsSchema,
  CreateDirectoryArgsSchema,
  ListDirectoryArgsSchema,
  MoveFileArgsSchema,
  SearchFilesArgsSchema,
  GetFileInfoArgsSchema,
  EditBlockArgsSchema,
  GetConfigArgsSchema,
  GetConfigValueArgsSchema,
  SetConfigValueArgsSchema,
  UpdateConfigArgsSchema,
} from './tools/schemas.js';
import { executeCommand, readOutput, forceTerminate, listSessions } from './tools/execute.js';
import { listProcesses, killProcess } from './tools/process.js';
import { getConfig, getConfigValue, setConfigValue, updateConfig } from './tools/config.js';
import {
  readFile,
  readMultipleFiles,
  writeFile,
  createDirectory,
  listDirectory,
  moveFile,
  searchFiles,
  getFileInfo,
  listAllowedDirectories,
} from './tools/filesystem.js';
import { parseEditBlock, performSearchReplace } from './tools/edit.js';

import { VERSION } from './version.js';

console.error("Loading server.ts");

export const server = new Server(
  {
    name: "desktop-commander",
    version: VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

console.error("Setting up request handlers...");

server.setRequestHandler(ListToolsRequestSchema, async () => {
  try {
    console.error("Generating tools list...");
    return {
      tools: [
      // Configuration tools
      {
        name: "get_config",
        description:
          "Get the complete server configuration as JSON.",
        inputSchema: zodToJsonSchema(GetConfigArgsSchema),
      },
      {
        name: "get_config_value",
        description:
          "Get a specific configuration value by key.",
        inputSchema: zodToJsonSchema(GetConfigValueArgsSchema),
      },
      {
        name: "set_config_value",
        description:
          "Set a specific configuration value by key.",
        inputSchema: zodToJsonSchema(SetConfigValueArgsSchema),
      },
      {
        name: "update_config",
        description:
          "Update multiple configuration values at once.",
        inputSchema: zodToJsonSchema(UpdateConfigArgsSchema),
      },
      
      // Terminal tools
      {
        name: "execute_command",
        description:
          "Execute a terminal command with timeout. Command will continue running in background if it doesn't complete within timeout.",
        inputSchema: zodToJsonSchema(ExecuteCommandArgsSchema),
      },
      {
        name: "read_output",
        description:
          "Read new output from a running terminal session.",
        inputSchema: zodToJsonSchema(ReadOutputArgsSchema),
      },
      {
        name: "force_terminate",
        description:
          "Force terminate a running terminal session.",
        inputSchema: zodToJsonSchema(ForceTerminateArgsSchema),
      },
      {
        name: "list_sessions",
        description:
          "List all active terminal sessions.",
        inputSchema: zodToJsonSchema(ListSessionsArgsSchema),
      },
      {
        name: "list_processes",
        description:
          "List all running processes. Returns process information including PID, " +
          "command name, CPU usage, and memory usage.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "kill_process",
        description:
          "Terminate a running process by PID. Use with caution as this will " +
          "forcefully terminate the specified process.",
        inputSchema: zodToJsonSchema(KillProcessArgsSchema),
      },
      {
        name: "block_command",
        description:
          "Add a command to the blacklist. Once blocked, the command cannot be executed until unblocked.",
        inputSchema: zodToJsonSchema(BlockCommandArgsSchema),
      },
      {
        name: "unblock_command",
        description:
          "Remove a command from the blacklist. Once unblocked, the command can be executed normally.",
        inputSchema: zodToJsonSchema(UnblockCommandArgsSchema),
      },
      {
        name: "list_blocked_commands",
        description:
          "List all currently blocked commands.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      // Filesystem tools
      {
        name: "read_file",
        description:
          "Read the complete contents of a file from the file system. " +
          "Handles various text encodings and provides detailed error messages " +
          "if the file cannot be read. Only works within allowed directories.",
        inputSchema: zodToJsonSchema(ReadFileArgsSchema),
      },
      {
        name: "read_multiple_files",
        description:
          "Read the contents of multiple files simultaneously. " +
          "Each file's content is returned with its path as a reference. " +
          "Failed reads for individual files won't stop the entire operation. " +
          "Only works within allowed directories.",
        inputSchema: zodToJsonSchema(ReadMultipleFilesArgsSchema),
      },
      {
        name: "write_file",
        description:
          "Completely replace file contents. Best for large changes (>20% of file) or when edit_block fails. " +
          "Use with caution as it will overwrite existing files. Only works within allowed directories.",
        inputSchema: zodToJsonSchema(WriteFileArgsSchema),
      },
      {
        name: "create_directory",
        description:
          "Create a new directory or ensure a directory exists. Can create multiple " +
          "nested directories in one operation. Only works within allowed directories.",
        inputSchema: zodToJsonSchema(CreateDirectoryArgsSchema),
      },
      {
        name: "list_directory",
        description:
          "Get a detailed listing of all files and directories in a specified path. " +
          "Results distinguish between files and directories with [FILE] and [DIR] prefixes. " +
          "Only works within allowed directories.",
        inputSchema: zodToJsonSchema(ListDirectoryArgsSchema),
      },
      {
        name: "move_file",
        description:
          "Move or rename files and directories. Can move files between directories " +
          "and rename them in a single operation. Both source and destination must be " +
          "within allowed directories.",
        inputSchema: zodToJsonSchema(MoveFileArgsSchema),
      },
      {
        name: "search_files",
        description:
          "Recursively search for files and directories matching a pattern. " +
          "Searches through all subdirectories from the starting path. " +
          "Only searches within allowed directories.",
        inputSchema: zodToJsonSchema(SearchFilesArgsSchema),
      },
      {
        name: "get_file_info",
        description:
          "Retrieve detailed metadata about a file or directory including size, " +
          "creation time, last modified time, permissions, and type. " +
          "Only works within allowed directories.",
        inputSchema: zodToJsonSchema(GetFileInfoArgsSchema),
      },
      {
        name: "list_allowed_directories",
        description: 
          "Returns the list of directories that this server is allowed to access.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "edit_block",
        description:
            "Apply surgical text replacements to files. Best for small changes (<20% of file size). " +
            "Multiple blocks can be used for separate changes. Will verify changes after application. " +
            "Format: filepath, then <<<<<<< SEARCH, content to find, =======, new content, >>>>>>> REPLACE.",
        inputSchema: zodToJsonSchema(EditBlockArgsSchema),
      },
      ],
    };
  } catch (error) {
    console.error(`Error generating tools list: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    throw error;
  }
});

server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      // Config tools
      case "get_config":
        try {
          return await getConfig();
        } catch (error) {
          console.error(`Error in get_config handler: ${error}`);
          return {
            content: [{ type: "text", text: `Error: Failed to get configuration` }],
            isError: true,
          };
        }
      case "get_config_value": 
        try {
          return await getConfigValue(args);
        } catch (error) {
          console.error(`Error in get_config_value handler: ${error}`);
          return {
            content: [{ type: "text", text: `Error: Failed to get configuration value` }],
            isError: true,
          };
        }
      case "set_config_value":
        try {
          return await setConfigValue(args);
        } catch (error) {
          console.error(`Error in set_config_value handler: ${error}`);
          return {
            content: [{ type: "text", text: `Error: Failed to set configuration value` }],
            isError: true,
          };
        }
      case "update_config":
        try {
          return await updateConfig(args);
        } catch (error) {
          console.error(`Error in update_config handler: ${error}`);
          return {
            content: [{ type: "text", text: `Error: Failed to update configuration` }],
            isError: true,
          };
        }
      
      // Terminal tools
      case "execute_command": {
        const parsed = ExecuteCommandArgsSchema.parse(args);
        return executeCommand(parsed);
      }
      case "read_output": {
        const parsed = ReadOutputArgsSchema.parse(args);
        return readOutput(parsed);
      }
      case "force_terminate": {
        const parsed = ForceTerminateArgsSchema.parse(args);
        return forceTerminate(parsed);
      }
      case "list_sessions":
        return listSessions();
      case "list_processes":
        return listProcesses();
      case "kill_process": {
        const parsed = KillProcessArgsSchema.parse(args);
        return killProcess(parsed);
      }
      case "block_command": {
        const parsed = BlockCommandArgsSchema.parse(args);
        const blockResult = await commandManager.blockCommand(parsed.command);
        return {
          content: [{ type: "text", text: blockResult }],
        };
      }
      case "unblock_command": {
        const parsed = UnblockCommandArgsSchema.parse(args);
        const unblockResult = await commandManager.unblockCommand(parsed.command);
        return {
          content: [{ type: "text", text: unblockResult }],
        };
      }
      case "list_blocked_commands": {
        const blockedCommands = await commandManager.listBlockedCommands();
        return {
          content: [{ type: "text", text: blockedCommands.join('\n') }],
        };
      }
      
      // Filesystem tools
      case "edit_block": {
        const parsed = EditBlockArgsSchema.parse(args);
        const { filePath, searchReplace } = await parseEditBlock(parsed.blockContent);
        await performSearchReplace(filePath, searchReplace);
        return {
          content: [{ type: "text", text: `Successfully applied edit to ${filePath}` }],
        };
      }
      case "read_file": {
        const parsed = ReadFileArgsSchema.parse(args);
        const content = await readFile(parsed.path);
        return {
          content: [{ type: "text", text: content }],
        };
      }
      case "read_multiple_files": {
        const parsed = ReadMultipleFilesArgsSchema.parse(args);
        const results = await readMultipleFiles(parsed.paths);
        return {
          content: [{ type: "text", text: results.join("\n---\n") }],
        };
      }
      case "write_file": {
        const parsed = WriteFileArgsSchema.parse(args);
        await writeFile(parsed.path, parsed.content);
        return {
          content: [{ type: "text", text: `Successfully wrote to ${parsed.path}` }],
        };
      }
      case "create_directory": {
        const parsed = CreateDirectoryArgsSchema.parse(args);
        await createDirectory(parsed.path);
        return {
          content: [{ type: "text", text: `Successfully created directory ${parsed.path}` }],
        };
      }
      case "list_directory": {
        const parsed = ListDirectoryArgsSchema.parse(args);
        const entries = await listDirectory(parsed.path);
        return {
          content: [{ type: "text", text: entries.join('\n') }],
        };
      }
      case "move_file": {
        const parsed = MoveFileArgsSchema.parse(args);
        await moveFile(parsed.source, parsed.destination);
        return {
          content: [{ type: "text", text: `Successfully moved ${parsed.source} to ${parsed.destination}` }],
        };
      }
      case "search_files": {
        const parsed = SearchFilesArgsSchema.parse(args);
        const results = await searchFiles(parsed.path, parsed.pattern);
        return {
          content: [{ type: "text", text: results.length > 0 ? results.join('\n') : "No matches found" }],
        };
      }
      case "get_file_info": {
        const parsed = GetFileInfoArgsSchema.parse(args);
        const info = await getFileInfo(parsed.path);
        return {
          content: [{ 
            type: "text", 
            text: Object.entries(info)
              .map(([key, value]) => `${key}: ${value}`)
              .join('\n') 
          }],
        };
      }
      case "list_allowed_directories": {
        const directories = listAllowedDirectories();
        return {
          content: [{ 
            type: "text", 
            text: `Allowed directories:\n${directories.join('\n')}` 
          }],
        };
      }
      // Config tools
      case "get_config":
        console.error("Handling get_config request");
        return getConfig();
      case "get_config_value": {
        console.error("Handling get_config_value request");
        const parsed = GetConfigValueArgsSchema.parse(args);
        return getConfigValue(parsed);
      }
      case "set_config_value": {
        console.error("Handling set_config_value request");
        const parsed = SetConfigValueArgsSchema.parse(args);
        return setConfigValue(parsed);
      }
      case "update_config": {
        console.error("Handling update_config request");
        const parsed = UpdateConfigArgsSchema.parse(args);
        return updateConfig(parsed);
      }

      default:
        console.error(`Unknown tool: ${name}`);
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});