import { knex } from 'knex';
import { EventLog, PersistenceObject } from '../types';
import { FilterOperators, FilterType, SortClause, WhereClause } from './filters';

export abstract class SqlPersistenceBase implements PersistenceObject {
  protected readonly _knexClient: knex.Knex;

  constructor(client: 'pg' | 'sqlite3') {
    this._knexClient = knex({ client, useNullAsDefault: true });
  }

  abstract init(): Promise<void>;

  abstract saveBatch(batch: EventLog[], blockNumber?: bigint | undefined): Promise<void>;

  abstract getLatestIndexedBlockForChain(chainId: number): Promise<number | undefined>;

  protected abstract getJsonObjectPropertySqlFragment(
    column: string,
    propertyName: string,
  ): string;

  protected abstract queryAll<T>(query: string): Promise<T[]>;

  abstract disconnect(): Promise<void>;

  public async filter<T extends {}>({
    table,
    whereClauses = [],
    sortClauses = [],
    limit = 100,
    offset = 0,
  }: {
    table: string;
    whereClauses: WhereClause[];
    sortClauses: SortClause[];
    limit: number;
    offset: number;
  }): Promise<T[]> {
    let query = this._knexClient.select('*').from<T>(table);

    for (const clause of whereClauses) {
      clause.field.includes('args')
        ? query.where(
            this._knexClient.raw(
              `${this.castAsNumericWhenRequested(
                this.getJsonObjectPropertySqlFragment('args', clause.field.slice(5)),
                clause.type,
              )} ${this.getSqlOperator(clause.operator)} ?`,
              [this.convertValue(clause.value, clause.type)],
            ),
          )
        : query.where(
            this._knexClient.raw(
              `${this.castAsNumericWhenRequested(
                `${table}."${clause.field}"`,
                clause.type,
              )} ${this.getSqlOperator(clause.operator)} ?`,
              [this.convertValue(clause.value, clause.type)],
            ),
          );
    }

    for (const clause of sortClauses) {
      if (clause.type == FilterType.TEXT) {
        clause.field.includes('args')
          ? query.orderByRaw(
              `${this.getJsonObjectPropertySqlFragment('args', clause.field.slice(5))} ${
                clause.direction
              }`,
            )
          : query.orderByRaw(`${table}."${clause.field}" ${clause.direction}`);
      } else {
        clause.field.includes('args')
          ? query.orderByRaw(
              `${this.castAsNumericWhenRequested(
                this.getJsonObjectPropertySqlFragment('args', clause.field.slice(5)),
                clause.type,
              )}  ${clause.direction}`,
            )
          : query.orderByRaw(
              `${this.castAsNumericWhenRequested(
                `${table}."${clause.field}"`,
                clause.type,
              )} ${clause.direction}`,
            );
      }
    }

    if (limit) {
      query.limit(limit);
    }

    if (offset >= 0) {
      query.offset(offset);
    }

    return this.queryAll<T>(query.toString());
  }

  protected getSqlOperator(operator: FilterOperators): string | undefined {
    switch (operator) {
      case FilterOperators.EQ:
        return '=';
      case FilterOperators.GT:
        return '>';
      case FilterOperators.GTE:
        return '>=';
      case FilterOperators.LT:
        return '<';
      case FilterOperators.LTE:
        return '<=';
      case FilterOperators.NEQ:
        return '<>';
      default:
        return undefined;
    }
  }

  protected convertValue(value: string, type: FilterType): string | number {
    switch (type) {
      case FilterType.TEXT:
        return value;
      case FilterType.NUMBER:
        return parseInt(value);
    }
  }

  protected castAsNumericWhenRequested(column: string, clauseType: FilterType): string {
    return clauseType === FilterType.NUMBER ? `CAST(${column} AS numeric)` : column;
  }
}
