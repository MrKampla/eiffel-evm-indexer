import { Knex, knex } from 'knex';
import { EventLog, PersistenceObject } from '../types';
import { FilterOperators, FilterType, SortClause, WhereClause } from './filters';

export abstract class SqlPersistenceBase implements PersistenceObject {
  protected readonly _knexClient: knex.Knex;

  constructor(client: 'pg' | 'sqlite3', dbUrl: string, dbSsl: boolean) {
    if ('sqlite3' === client) {
      // Knex with SQLite3 does not work in Bun due to missing bindings
      // https://github.com/oven-sh/bun/issues/4959
      // You can use it to build queries but not to execute them
      this._knexClient = knex({
        client: 'better-sqlite3',
        useNullAsDefault: true,
        connection: {
          filename: dbUrl,
        },
        log: {
          warn() {},
        },
      });
      return;
    }
    this._knexClient = knex({
      client,
      useNullAsDefault: true,
      connection: {
        connectionString: dbUrl,
        ssl: dbSsl,
      },
    });
  }

  public getUnderlyingDataSource(): Knex {
    return this._knexClient;
  }

  abstract init(): Promise<void>;

  abstract saveBatch(batch: EventLog[], blockNumber?: bigint | undefined): Promise<void>;

  abstract getLatestIndexedBlockForChain(chainId: number): Promise<number | undefined>;

  protected abstract getJsonObjectPropertySqlFragment(
    column: string,
    propertyName: string,
  ): string;

  abstract queryAll<T>(query: string): Promise<T[]>;

  abstract queryOne<T>(query: string): Promise<T>;

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
      const queriedField = clause.field.includes('args')
        ? this.getJsonObjectPropertySqlFragment('args', clause.field.slice(5))
        : `${table}."${clause.field}"`;
      query.where(
        this._knexClient.raw(
          `${this.castAsNumericWhenRequested(
            queriedField,
            clause.type,
          )} ${this.getSqlOperator(clause.operator)} ?`,
          [this.convertValue(clause.value, clause.type)],
        ),
      );
    }

    for (const clause of sortClauses) {
      const queriedField = clause.field.includes('args')
        ? this.getJsonObjectPropertySqlFragment('args', clause.field.slice(5))
        : `${table}."${clause.field}"`;
      if (clause.type == FilterType.TEXT) {
        query.orderByRaw(`${queriedField} ${clause.direction}`);
      } else {
        query.orderByRaw(
          `${this.castAsNumericWhenRequested(queriedField, clause.type)} ${
            clause.direction
          }`,
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
