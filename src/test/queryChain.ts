export type QueryFilter = {
  op: 'eq' | 'neq' | 'in'
  column: string
  value: unknown
}

export type RecordedQuery = {
  table: string
  select?: string
  filters: QueryFilter[]
  range?: { from: number; to: number }
  limited: boolean
  method: 'select' | 'insert' | 'update'
  payload?: unknown
}

export type QueryResult = { data: unknown; error: { message: string } | null }

export function blankQuery(table: string): RecordedQuery {
  return { table, filters: [], limited: false, method: 'select' }
}

/** The shared Supabase query chain. Each test decides what a recorded query resolves to. */
export function queryChain(query: RecordedQuery, resolve: () => QueryResult) {
  const chain = {
    select(columns: string) {
      query.select = columns
      return chain
    },
    eq(column: string, value: unknown) {
      query.filters.push({ op: 'eq', column, value })
      return chain
    },
    neq(column: string, value: unknown) {
      query.filters.push({ op: 'neq', column, value })
      return chain
    },
    in(column: string, value: unknown) {
      query.filters.push({ op: 'in', column, value })
      return chain
    },
    limit() {
      query.limited = true
      return chain
    },
    range(from: number, to: number) {
      query.range = { from, to }
      return chain
    },
    insert(payload: unknown) {
      query.method = 'insert'
      query.payload = payload
      return chain
    },
    update(payload: unknown) {
      query.method = 'update'
      query.payload = payload
      return chain
    },
    maybeSingle() {
      return Promise.resolve(resolve())
    },
    single() {
      return Promise.resolve(resolve())
    },
    then(
      onFulfilled: (value: QueryResult) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      return Promise.resolve(resolve()).then(onFulfilled, onRejected)
    },
  }
  return chain
}

export function shiftQueue(
  queues: Map<string, QueryResult[]>,
  table: string,
): QueryResult {
  const next = queues.get(table)?.shift()
  if (!next) throw new Error(`No response queued for ${table}`)
  return next
}
