/**
 * huadrink schema 專用 client，華地產春酒所有資料表皆在此 schema
 */
import { supabase } from '@/integrations/supabase/client';

export const huadrink = supabase.schema('huadrink');
