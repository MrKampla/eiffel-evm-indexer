import { knex } from 'knex';
import { EventLog, PersistenceObject } from '../types';
import { FilterOperators, FilterTypes, SortClause, WhereClause } from './filters';

export abstract class SqlPersistenceBase implements PersistenceObject {
  protected readonly _knexClient: knex.Knex;

  constructor(client: 'pg' | 'sqlite3') {
    this._knexClient = knex({ client });
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
              `${this.getJsonObjectPropertySqlFragment(
                'args',
                clause.field.slice(5),
              )} ${this.getSqlOperator(clause.operator)} ?`,
              [this.convert(clause.value, clause.type)],
            ),
          )
        : query.where(
            this._knexClient.raw(
              `${table}."${clause.field}" ${this.getSqlOperator(clause.operator)} ?`,
              [this.convert(clause.value, clause.type)],
            ),
          );
    }

    for (const clause of sortClauses) {
      if (clause.type == FilterTypes.TEXT) {
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
              `CAST(${this.getJsonObjectPropertySqlFragment(
                'args',
                clause.field.slice(5),
              )} AS numeric) ${clause.direction}`,
            )
          : query.orderByRaw(
              `CAST(${table}."${clause.field}" AS numeric) ${clause.direction}`,
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

  protected convert(value: string, type: FilterTypes): string | number {
    switch (type) {
      case FilterTypes.TEXT:
        return value;
      case FilterTypes.NUMBER:
        return parseInt(value);
    }
  }
}
