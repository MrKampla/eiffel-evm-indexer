export interface WhereClause {
  field: string;
  operator: FilterOperators;
  type: FilterTypes;
  value: string;
}

export interface SortClause {
  field: string;
  direction: 'ASC' | 'DESC';
  type: FilterTypes;
}

export enum FilterOperators {
  EQ = 'EQ',
  GT = 'GT',
  GTE = 'GTE',
  LT = 'LT',
  LTE = 'LTE',
  NEQ = 'NEQ',
}

export enum FilterTypes {
  TEXT = 'TEXT',
  NUMBER = 'INT',
}
