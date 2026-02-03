/**
 * huadrink schema 專用 client，避免與共同資料庫其他專案衝突
 */
import { supabase } from '@/integrations/supabase/client';

export const huadrink = supabase.schema('huadrink');
