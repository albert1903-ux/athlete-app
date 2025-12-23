
/**
 * Mock Supabase Client for Local SQLite connection
 * Redirects queries to the local Python backend
 */

class SupabaseQueryBuilder {
    constructor(table) {
        this.query = {
            table,
            select: '*',
            filters: [],
            order: null,
            limit: null
        }
        this._single = false
        this._maybeSingle = false
    }

    select(columns) {
        this.query.select = columns
        return this
    }

    // Filters
    eq(column, value) {
        this.query.filters.push({ column, operator: 'eq', value })
        return this
    }

    neq(column, value) {
        this.query.filters.push({ column, operator: 'neq', value })
        return this
    }

    gt(column, value) {
        this.query.filters.push({ column, operator: 'gt', value })
        return this
    }

    gte(column, value) {
        this.query.filters.push({ column, operator: 'gte', value })
        return this
    }

    lt(column, value) {
        this.query.filters.push({ column, operator: 'lt', value })
        return this
    }

    lte(column, value) {
        this.query.filters.push({ column, operator: 'lte', value })
        return this
    }

    like(column, value) {
        this.query.filters.push({ column, operator: 'like', value })
        return this
    }

    ilike(column, value) {
        this.query.filters.push({ column, operator: 'ilike', value })
        return this
    }

    in(column, values) {
        this.query.filters.push({ column, operator: 'in', value: values })
        return this
    }

    is(column, value) {
        // value is usually null
        this.query.filters.push({ column, operator: 'eq', value })
        return this
    }

    // Modifiers
    order(column, options = { ascending: true }) {
        if (!this.query.order) this.query.order = []
        if (!Array.isArray(this.query.order)) this.query.order = [this.query.order]

        this.query.order.push({
            column,
            ascending: options.ascending !== undefined ? options.ascending : true
        })
        return this
    }

    limit(count) {
        this.query.limit = count
        return this
    }

    range(from, to) {
        // Approximate range using limit + offset (not implemented in backend yet, but we can set limit)
        // For now just set limit to (to - from + 1)
        this.query.limit = (to - from + 1)
        // We would need offset... skipping implementation for now as simple usage mostly uses limit
        return this
    }

    single() {
        this._single = true
        this.query.limit = 1
        return this
    }

    maybeSingle() {
        this._maybeSingle = true
        this.query.limit = 1
        return this
    }

    // Execution
    async then(resolve, reject) {
        try {
            // Assume backend is on port 5001 as per app.py default
            const response = await fetch('http://localhost:5001/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.query)
            })

            if (!response.ok) {
                throw new Error(`Local DB Error: ${response.statusText}`)
            }

            const result = await response.json()

            let data = result.data
            let error = result.error

            // Handle single/maybeSingle
            if (data && (this._single || this._maybeSingle)) {
                if (data.length === 0) {
                    if (this._single) {
                        error = { message: 'JSON object requested, multiple (or no) rows returned', details: 'The result contains 0 rows', hint: null, code: 'PGRST116' }
                        data = null
                    } else {
                        data = null
                    }
                } else if (data.length > 1) {
                    if (this._single) {
                        error = { message: 'JSON object requested, multiple rows returned', details: `The result contains ${data.length} rows`, hint: null, code: 'PGRST116' }
                        data = null
                    } else {
                        data = data[0]
                    }
                } else {
                    data = data[0]
                }
            }

            resolve({ data, error })
        } catch (err) {
            if (reject) reject(err)
            else resolve({ data: null, error: err })
        }
    }
}

export const mockSupabase = {
    from: (table) => new SupabaseQueryBuilder(table),
}
