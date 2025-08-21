import { databaseConnectionPoolService } from './services/DatabaseConnectionPoolService';

// Export the pooled database connection
export const db = databaseConnectionPoolService.getDatabase();

// Export legacy pool reference for compatibility
export const pool = {
  query: async (text: string, params?: any[]) => {
    return databaseConnectionPoolService.executeQuery(
      databaseConnectionPoolService.getDatabase().execute(text),
      { name: 'raw_query', type: 'legacy' }
    );
  }
};