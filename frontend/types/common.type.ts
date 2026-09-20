/**
 * Common types used across the application
 */

// Base query DTO for pagination and sorting
export interface BaseQueryDto {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Paginated response wrapper
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  currentPage: number;
}

