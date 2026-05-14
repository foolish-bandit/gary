import {
    createClient,
    type SupabaseClient,
} from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

let client: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            "Missing Supabase frontend config. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY.",
        );
    }
    if (!client) {
        client = createClient(supabaseUrl, supabaseAnonKey);
    }
    return client;
}

export const supabase = new Proxy({} as SupabaseClient, {
    get(_target, prop, receiver) {
        return Reflect.get(getSupabaseClient(), prop, receiver);
    },
});
