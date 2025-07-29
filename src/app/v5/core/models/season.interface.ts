export interface Season {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_closed: boolean;
  is_historical: boolean;
  school_id: number;
  created_at: string;
}
