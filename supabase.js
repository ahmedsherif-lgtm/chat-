
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// رابط مشروعك الأساسي
const SUPABASE_URL = "https://fhajrgalxpvnfnowfzeh.supabase.co";

// ضع هنا Publishable key الخاص بمشروعك
const SUPABASE_KEY = "sb_publishable_-I2Hf48vcQH_cPNfmMPmgg_yiHumS1K";

// إنشاء اتصال Supabase
export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);