import { createClient } from '@supabase/supabase-js'
import { mockSupabase } from './mockSupabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

const realSupabase = createClient(supabaseUrl, supabaseKey)
const useLocalDB = import.meta.env.VITE_USE_LOCAL_DB === 'true'

export const supabase = useLocalDB
    ? new Proxy(realSupabase, {
        get: function (target, prop) {
            if (prop === 'from') {
                return mockSupabase.from
            }
            return target[prop]
        }
    })
    : realSupabase






