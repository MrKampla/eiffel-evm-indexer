import { knex } from 'knex';
import { EventLog, PersistenceObject } from '../types';
import { FilterOperators, FilterTypes, SortClosure, WhereClosure } from './filters';

export abstract class SqlPersistenceBase implements PersistenceObject {
  protected readonly _knexClient: knex.Knex;
  
  constructor(client: 'pg'|'sqlite3') {
    this._knexClient = knex({ client });
  }

  abstract init(): Promise<void>;

  abstract saveBatch(batch: EventLog[], blockNumber?: bigint | undefined): Promise<void>;

  abstract getLatestIndexedBlockForChain(chainId: number): Promise<number | undefined>;

  protected abstract getJsonObjectPropertySqlFragment(column: string, propertyName: string): string;

  protected abstract queryAll<T>(query: string): Promise<T[]>;

  abstract disconnect(): Promise<void>;

  public async filter<T extends {}>(
    table: string,
    whereClosures: WhereClosure[] = [],
    sortClosures: SortClosure[] = [],
    limit: number = 100,
    offset: number = 0,
  ): Promise<T[]> {
    let query = this._knexClient.select('*').from<T>(table);

    for (const c of whereClosures) {
        query = c.field.includes('args')
          ? query.where(
              this._knexClient.raw(
                `${this.getJsonObjectPropertySqlFragment(
                  'args',
                  c.field.slice(5),
                )} ${this.getSqlOperator(c.operator)} ?`,
                [this.convert(c.value, c.type)],
              ),
            )
          : query.where(this._knexClient.raw(`${table}."${c.field}" ${this.getSqlOperator(c.operator)} ?`, [this.convert(c.value, c.type)]));
      }
    
      for (const c of sortClosures) {
        if(c.type == FilterTypes.TEXT) {
            query = c.field.includes('args')
            ? query.orderByRaw(
                `${this.getJsonObjectPropertySqlFragment(
                  'args',
                  c.field.slice(5),
                )} ${c.direction}`,
              )
            : query.orderByRaw(`${table}."${c.field}" ${c.direction}`);
        }
        else {
            query = c.field.includes('args')
            ? query.orderByRaw(
                `CAST(${this.getJsonObjectPropertySqlFragment(
                  'args',
                  c.field.slice(5),
                )} AS numeric) ${c.direction}`,
              )
            : query.orderByRaw(`CAST(${table}."${c.field}" AS numeric) ${c.direction}`);
        }
      }
    
      if (limit) {
        query = query.limit(limit);
      }
    
      if (offset >= 0) {
        query = query.offset(offset);
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
