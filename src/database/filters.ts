export interface WhereClause {
  field: string;
  operator: FilterOperators;
  type: FilterType;
  value: string;
}

export interface SortClause {
  field: string;
  direction: 'ASC' | 'DESC';
  type: FilterType;
}

export enum FilterOperators {
  EQ = 'EQ',
  EQCI = 'EQCI', // case-insensitive
  IN = 'IN',
  NOTIN = 'NOTIN',
  GT = 'GT',
  GTE = 'GTE',
  LT = 'LT',
  LTE = 'LTE',
  NEQ = 'NEQ',
}

export enum FilterType {
  TEXT = 'TEXT',
  NUMBER = 'NUM',
}
