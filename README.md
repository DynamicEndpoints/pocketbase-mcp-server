# Advanced PocketBase MCP Server

A comprehensive MCP server that provides sophisticated tools for interacting with PocketBase databases. This server enables advanced database operations, schema management, and data manipulation through the Model Context Protocol (MCP).

## Features

### Collection Management
- Create and manage collections with custom schemas
- Migrate collection schemas with data preservation
- Advanced index management (create, delete, list)
- Schema validation and type safety
- Retrieve collection schemas and metadata

### Record Operations
- CRUD operations for records
- Advanced querying with filtering, sorting, and aggregation
- Batch import/export capabilities
- Relationship expansion support
- Pagination and cursor-based navigation

### User Management
- User authentication and token management
- User account creation and management
- Password management
- Role-based access control
- Session handling

### Database Operations
- Database backup and restore
- Multiple export formats (JSON/CSV)
- Data migration tools
- Index optimization
- Batch operations

## Available Tools

### Collection Management
- `create_collection`: Create a new collection with custom schema
- `get_collection_schema`: Get schema details for a collection
- `migrate_collection`: Migrate collection schema with data preservation
- `manage_indexes`: Create, delete, or list collection indexes

### Record Operations
- `create_record`: Create a new record in a collection
- `list_records`: List records with optional filters and pagination
- `update_record`: Update an existing record
- `delete_record`: Delete a record
- `query_collection`: Advanced query with filtering, sorting, and aggregation
- `import_data`: Import data into a collection with create/update/upsert modes

### User Management
- `authenticate_user`: Authenticate a user and get auth token
- `create_user`: Create a new user account

### Database Operations
- `backup_database`: Create a backup of the PocketBase database with format options
- `import_data`: Import data with various modes (create/update/upsert)

## Configuration

The server requires the following environment variables:

- `POCKETBASE_URL`: URL of your PocketBase instance (e.g., "http://127.0.0.1:8090")

Optional environment variables:
- `POCKETBASE_ADMIN_EMAIL`: Admin email for certain operations
- `POCKETBASE_ADMIN_PASSWORD`: Admin password
- `POCKETBASE_DATA_DIR`: Custom data directory path

## Usage Examples

### Collection Management
```typescript
// Create a new collection
await mcp.use_tool("pocketbase", "create_collection", {
  name: "posts",
  schema: [
    {
      name: "title",
      type: "text",
      required: true
    },
    {
      name: "content",
      type: "text",
      required: true
    }
  ]
});

// Manage indexes
await mcp.use_tool("pocketbase", "manage_indexes", {
  collection: "posts",
  action: "create",
  index: {
    name: "title_idx",
    fields: ["title"],
    unique: true
  }
});
```

### Advanced Querying
```typescript
// Query with filtering, sorting, and aggregation
await mcp.use_tool("pocketbase", "query_collection", {
  collection: "posts",
  filter: "created >= '2024-01-01'",
  sort: "-created",
  aggregate: {
    totalLikes: "sum(likes)",
    avgRating: "avg(rating)"
  },
  expand: "author,categories"
});
```

### Data Import/Export
```typescript
// Import data with upsert mode
await mcp.use_tool("pocketbase", "import_data", {
  collection: "posts",
  data: [
    {
      title: "First Post",
      content: "Hello World"
    },
    {
      title: "Second Post",
      content: "More content"
    }
  ],
  mode: "upsert"
});

// Backup database
await mcp.use_tool("pocketbase", "backup_database", {
  format: "json" // or "csv"
});
```

### Schema Migration
```typescript
// Migrate collection schema
await mcp.use_tool("pocketbase", "migrate_collection", {
  collection: "posts",
  newSchema: [
    {
      name: "title",
      type: "text",
      required: true
    },
    {
      name: "content",
      type: "text",
      required: true
    },
    {
      name: "tags",
      type: "json",
      required: false
    }
  ],
  dataTransforms: {
    // Optional field transformations during migration
    tags: "JSON.parse(oldTags)"
  }
});
```

## Error Handling

All tools include comprehensive error handling with detailed error messages. Errors are properly typed and include:
- Invalid request errors
- Authentication errors
- Database operation errors
- Schema validation errors
- Network errors

## Type Safety

The server includes TypeScript definitions for all operations, ensuring type safety when using the tools. Each tool's input schema is strictly typed and validated.

## Best Practices

1. Always use proper error handling with try/catch blocks
2. Validate data before performing operations
3. Use appropriate indexes for better query performance
4. Regularly backup your database
5. Use migrations for schema changes
6. Follow security best practices for user management
7. Monitor and optimize database performance

## Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure
4. Build: `npm run build`
5. Start your PocketBase instance
6. The MCP server will automatically connect to your PocketBase instance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request