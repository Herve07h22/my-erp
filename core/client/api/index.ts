/**
 * API Client abstraction layer
 * Exports types and implementations for dependency injection
 */
export type {
  ApiClient,
  Domain,
  DomainOperator,
  DomainCondition,
  SearchOptions,
  RecordData,
  FieldDefinition,
  FieldsCollection,
  ViewDefinition,
  ActionDefinition,
  MenuItem,
  SearchResult,
} from './types.js';

export { ApiError } from './types.js';
export { FetchApiClient, apiClient } from './client.js';
export { MockApiClient, createMockApiClient } from './mock.js';
export type { MockData, MockConfig } from './mock.js';
