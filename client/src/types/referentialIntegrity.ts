export interface DeletionCheck {
  canDelete: boolean;
  blockedBy: Array<{
    table: string;
    count: number;
    description: string;
  }>;
  warnings: Array<{
    table: string;
    count: number;
    description: string;
    action: 'cascade' | 'nullify';
  }>;
}
