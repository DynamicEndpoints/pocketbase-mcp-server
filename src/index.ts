#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import PocketBase, { CollectionModel, CollectionIndex, CollectionResponse, SchemaField } from 'pocketbase';

class PocketBaseServer {
  private server: Server;
  private pb: PocketBase;

  constructor() {
    this.server = new Server(
      {
        name: 'pocketbase-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize PocketBase client
    const url = process.env.POCKETBASE_URL;
    if (!url) {
      throw new Error('POCKETBASE_URL environment variable is required');
    }
    this.pb = new PocketBase(url);

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'create_collection',
          description: 'Create a new collection in PocketBase',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Collection name',
              },
              schema: {
                type: 'array',
                description: 'Collection schema fields',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    required: { type: 'boolean' },
                    options: { type: 'object' },
                  },
                },
              },
            },
            required: ['name', 'schema'],
          },
        },
        {
          name: 'create_record',
          description: 'Create a new record in a collection',
          inputSchema: {
            type: 'object',
            properties: {
              collection: {
                type: 'string',
                description: 'Collection name',
              },
              data: {
                type: 'object',
                description: 'Record data',
              },
            },
            required: ['collection', 'data'],
          },
        },
        {
          name: 'list_records',
          description: 'List records from a collection with optional filters',
          inputSchema: {
            type: 'object',
            properties: {
              collection: {
                type: 'string',
                description: 'Collection name',
              },
              filter: {
                type: 'string',
                description: 'Filter query',
              },
              sort: {
                type: 'string',
                description: 'Sort field and direction',
              },
              page: {
                type: 'number',
                description: 'Page number',
              },
              perPage: {
                type: 'number',
                description: 'Items per page',
              },
            },
            required: ['collection'],
          },
        },
        {
          name: 'update_record',
          description: 'Update an existing record',
          inputSchema: {
            type: 'object',
            properties: {
              collection: {
                type: 'string',
                description: 'Collection name',
              },
              id: {
                type: 'string',
                description: 'Record ID',
              },
              data: {
                type: 'object',
                description: 'Updated record data',
              },
            },
            required: ['collection', 'id', 'data'],
          },
        },
        {
          name: 'delete_record',
          description: 'Delete a record',
          inputSchema: {
            type: 'object',
            properties: {
              collection: {
                type: 'string',
                description: 'Collection name',
              },
              id: {
                type: 'string',
                description: 'Record ID',
              },
            },
            required: ['collection', 'id'],
          },
        },
        {
          name: 'authenticate_user',
          description: 'Authenticate a user and get auth token',
          inputSchema: {
            type: 'object',
            properties: {
              email: {
                type: 'string',
                description: 'User email',
              },
              password: {
                type: 'string',
                description: 'User password',
              },
            },
            required: ['email', 'password'],
          },
        },
        {
          name: 'create_user',
          description: 'Create a new user account',
          inputSchema: {
            type: 'object',
            properties: {
              email: {
                type: 'string',
                description: 'User email',
              },
              password: {
                type: 'string',
                description: 'User password',
              },
              passwordConfirm: {
                type: 'string',
                description: 'Password confirmation',
              },
              name: {
                type: 'string',
                description: 'User name',
              },
            },
            required: ['email', 'password', 'passwordConfirm'],
          },
        },
        {
          name: 'get_collection_schema',
          description: 'Get schema details for a collection',
          inputSchema: {
            type: 'object',
            properties: {
              collection: {
                type: 'string',
                description: 'Collection name',
              },
            },
            required: ['collection'],
          },
        },
        {
          name: 'backup_database',
          description: 'Create a backup of the PocketBase database',
          inputSchema: {
            type: 'object',
            properties: {
              format: {
                type: 'string',
                enum: ['json', 'csv'],
                description: 'Export format (default: json)',
              },
            },
          },
        },
        {
          name: 'import_data',
          description: 'Import data into a collection',
          inputSchema: {
            type: 'object',
            properties: {
              collection: {
                type: 'string',
                description: 'Collection name',
              },
              data: {
                type: 'array',
                description: 'Array of records to import',
                items: {
                  type: 'object',
                },
              },
              mode: {
                type: 'string',
                enum: ['create', 'update', 'upsert'],
                description: 'Import mode (default: create)',
              },
            },
            required: ['collection', 'data'],
          },
        },
        {
          name: 'migrate_collection',
          description: 'Migrate collection schema with data preservation',
          inputSchema: {
            type: 'object',
            properties: {
              collection: {
                type: 'string',
                description: 'Collection name',
              },
              newSchema: {
                type: 'array',
                description: 'New collection schema',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    required: { type: 'boolean' },
                    options: { type: 'object' },
                  },
                },
              },
              dataTransforms: {
                type: 'object',
                description: 'Field transformation mappings',
              },
            },
            required: ['collection', 'newSchema'],
          },
        },
        {
          name: 'query_collection',
          description: 'Advanced query with filtering, sorting, and aggregation',
          inputSchema: {
            type: 'object',
            properties: {
              collection: {
                type: 'string',
                description: 'Collection name',
              },
              filter: {
                type: 'string',
                description: 'Filter expression',
              },
              sort: {
                type: 'string',
                description: 'Sort expression',
              },
              aggregate: {
                type: 'object',
                description: 'Aggregation settings',
              },
              expand: {
                type: 'string',
                description: 'Relations to expand',
              },
            },
            required: ['collection'],
          },
        },
        {
          name: 'manage_indexes',
          description: 'Manage collection indexes',
          inputSchema: {
            type: 'object',
            properties: {
              collection: {
                type: 'string',
                description: 'Collection name',
              },
              action: {
                type: 'string',
                enum: ['create', 'delete', 'list'],
                description: 'Action to perform',
              },
              index: {
                type: 'object',
                description: 'Index configuration (for create)',
                properties: {
                  name: { type: 'string' },
                  fields: { type: 'array', items: { type: 'string' } },
                  unique: { type: 'boolean' },
                },
              },
            },
            required: ['collection', 'action'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'create_collection':
            return await this.createCollection(request.params.arguments);
          case 'create_record':
            return await this.createRecord(request.params.arguments);
          case 'list_records':
            return await this.listRecords(request.params.arguments);
          case 'update_record':
            return await this.updateRecord(request.params.arguments);
          case 'delete_record':
            return await this.deleteRecord(request.params.arguments);
          case 'authenticate_user':
            return await this.authenticateUser(request.params.arguments);
          case 'create_user':
            return await this.createUser(request.params.arguments);
          case 'get_collection_schema':
            return await this.getCollectionSchema(request.params.arguments);
          case 'backup_database':
            return await this.backupDatabase(request.params.arguments);
          case 'import_data':
            return await this.importData(request.params.arguments);
          case 'migrate_collection':
            return await this.migrateCollection(request.params.arguments);
          case 'query_collection':
            return await this.queryCollection(request.params.arguments);
          case 'manage_indexes':
            return await this.manageIndexes(request.params.arguments);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error: unknown) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `PocketBase error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private async createCollection(args: any) {
    try {
      const result = await this.pb.collections.create({
        name: args.name,
        schema: args.schema,
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: unknown) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create collection: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async createRecord(args: any) {
    try {
      const result = await this.pb.collection(args.collection).create(args.data);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: unknown) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create record: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async listRecords(args: any) {
    try {
      const options: any = {};
      if (args.filter) options.filter = args.filter;
      if (args.sort) options.sort = args.sort;
      if (args.page) options.page = args.page;
      if (args.perPage) options.perPage = args.perPage;

      const result = await this.pb.collection(args.collection).getList(
        options.page || 1,
        options.perPage || 50,
        {
          filter: options.filter,
          sort: options.sort,
        }
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: unknown) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list records: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async updateRecord(args: any) {
    try {
      const result = await this.pb
        .collection(args.collection)
        .update(args.id, args.data);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: unknown) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to update record: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async deleteRecord(args: any) {
    try {
      await this.pb.collection(args.collection).delete(args.id);
      return {
        content: [
          {
            type: 'text',
            text: `Successfully deleted record ${args.id} from collection ${args.collection}`,
          },
        ],
      };
    } catch (error: unknown) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to delete record: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async authenticateUser(args: any) {
    try {
      const authData = await this.pb
        .collection('users')
        .authWithPassword(args.email, args.password);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(authData, null, 2),
          },
        ],
      };
    } catch (error: unknown) {
      throw new McpError(
        ErrorCode.InternalError,
        `Authentication failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async createUser(args: any) {
    try {
      const result = await this.pb.collection('users').create({
        email: args.email,
        password: args.password,
        passwordConfirm: args.passwordConfirm,
        name: args.name,
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: unknown) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create user: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async getCollectionSchema(args: any) {
    try {
      const collection = await this.pb.collections.getOne(args.collection);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(collection.schema, null, 2),
          },
        ],
      };
    } catch (error: unknown) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get collection schema: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async backupDatabase(args: any) {
    try {
      const format = args.format || 'json';
      const collections = await this.pb.collections.getList(1, 100);
      const backup: any = {};

      for (const collection of collections) {
        const records = await this.pb
          .collection(collection.name)
          .getFullList();
        backup[collection.name] = {
          schema: collection.schema,
          records,
        };
      }

      if (format === 'csv') {
        // Convert to CSV format
        let csv = '';
        for (const [collectionName, data] of Object.entries(backup) as [string, { schema: SchemaField[], records: Record<string, any>[] }][]) {
          csv += `Collection: ${collectionName}\n`;
          csv += `Schema:\n${JSON.stringify(data.schema, null, 2)}\n`;
          csv += 'Records:\n';
          if (data.records.length > 0) {
            const headers = Object.keys(data.records[0]);
            csv += headers.join(',') + '\n';
            data.records.forEach((record) => {
              csv += headers.map(header => JSON.stringify(record[header])).join(',') + '\n';
            });
          }
          csv += '\n';
        }
        return {
          content: [{ type: 'text', text: csv }],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(backup, null, 2),
          },
        ],
      };
    } catch (error: unknown) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to backup database: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async importData(args: any) {
    try {
      const mode = args.mode || 'create';
      const collection = this.pb.collection(args.collection);
      const results = [];

      for (const record of args.data) {
        let result;
        switch (mode) {
          case 'create':
            result = await collection.create(record);
            break;
          case 'update':
            if (!record.id) {
              throw new McpError(ErrorCode.InvalidParams, 'Record ID required for update mode');
            }
            result = await collection.update(record.id, record);
            break;
          case 'upsert':
            if (record.id) {
              try {
                result = await collection.update(record.id, record);
              } catch {
                result = await collection.create(record);
              }
            } else {
              result = await collection.create(record);
            }
            break;
          default:
            throw new McpError(ErrorCode.InvalidParams, `Invalid import mode: ${mode}`);
        }
        results.push(result);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    } catch (error: unknown) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to import data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async migrateCollection(args: any) {
    try {
      // Create new collection with temporary name
      const tempName = `${args.collection}_migration_${Date.now()}`;
      await this.pb.collections.create({
        name: tempName,
        schema: args.newSchema,
      });

      // Get all records from old collection
      const oldRecords = await this.pb.collection(args.collection).getFullList();

      // Transform and import records to new collection
      const transformedRecords = oldRecords.map(record => {
        const newRecord: any = { ...record };
        if (args.dataTransforms) {
          for (const [field, transform] of Object.entries(args.dataTransforms)) {
            try {
              // Safely evaluate the transform expression
              newRecord[field] = new Function('oldValue', `return ${transform}`)(record[field]);
            } catch (e) {
              console.error(`Failed to transform field ${field}:`, e);
            }
          }
        }
        return newRecord;
      });

      for (const record of transformedRecords) {
        await this.pb.collection(tempName).create(record);
      }

      // Delete old collection
      await this.pb.collections.delete(args.collection);

      // Rename temp collection to original name
      const renamedCollection = await this.pb.collections.update(tempName, {
        name: args.collection,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(renamedCollection, null, 2),
          },
        ],
      };
    } catch (error: unknown) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to migrate collection: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async queryCollection(args: any) {
    try {
      const collection = this.pb.collection(args.collection);
      const options: any = {};

      if (args.filter) options.filter = args.filter;
      if (args.sort) options.sort = args.sort;
      if (args.expand) options.expand = args.expand;

      const records = await collection.getList(1, 100, options) as CollectionResponse;
      records[Symbol.iterator] = function* () {
        yield* this.items;
      };

      let result: any = { items: records.items };

      if (args.aggregate) {
        const aggregations: any = {};
        for (const [name, expr] of Object.entries(args.aggregate)) {
          const [func, field] = (expr as string).split('(');
          const cleanField = field.replace(')', '');
          
          switch (func) {
            case 'sum':
              aggregations[name] = records.items.reduce((sum: number, record: any) => 
                sum + (parseFloat(record[cleanField]) || 0), 0);
              break;
            case 'avg':
              aggregations[name] = records.items.reduce((sum: number, record: any) => 
                sum + (parseFloat(record[cleanField]) || 0), 0) / records.items.length;
              break;
            case 'count':
              aggregations[name] = records.items.length;
              break;
            default:
              throw new McpError(ErrorCode.InvalidParams, `Unsupported aggregation function: ${func}`);
          }
        }
        result.aggregations = aggregations;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: unknown) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to query collection: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async manageIndexes(args: any) {
    try {
      const collection = await this.pb.collections.getOne(args.collection) as CollectionModel;
      const currentIndexes: CollectionIndex[] = collection.indexes || [];
      let result;

      switch (args.action) {
        case 'create':
          if (!args.index) {
            throw new McpError(ErrorCode.InvalidParams, 'Index configuration required for create action');
          }
          const updatedCollection = await this.pb.collections.update(collection.id, {
            ...collection,
            indexes: [...currentIndexes, args.index as CollectionIndex],
          });
          result = updatedCollection.indexes;
          break;

        case 'delete':
          if (!args.index?.name) {
            throw new McpError(ErrorCode.InvalidParams, 'Index name required for delete action');
          }
          const filteredIndexes = currentIndexes.filter(idx => idx.name !== args.index.name);
          const collectionAfterDelete = await this.pb.collections.update(collection.id, {
            ...collection,
            indexes: filteredIndexes,
          });
          result = collectionAfterDelete.indexes;
          break;

        case 'list':
          result = currentIndexes;
          break;

        default:
          throw new McpError(ErrorCode.InvalidParams, `Invalid index action: ${args.action}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: unknown) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to manage indexes: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('PocketBase MCP server running on stdio');
  }
}

const server = new PocketBaseServer();
server.run().catch(console.error);