export interface CourseInterval {
  id?: number;
  course_id: number;
  name: string;
  start_date: string;
  end_date: string;
  display_order: number;
  config_mode: 'inherit' | 'custom';
  date_generation_method?: 'consecutive' | 'weekly' | 'manual' | 'first_day' | null;
  consecutive_days_count?: number | null;
  weekly_pattern?: WeeklyPattern | null;
  booking_mode: 'flexible' | 'package';
  created_at?: string;
  updated_at?: string;
  courseDates?: any[]; // Course dates related to this interval
  discounts?: Array<{
    id?: number;
    days: number;
    type: 'percentage' | 'fixed' | string;
    value: number;
  }>;
}

export interface WeeklyPattern {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

export interface CourseWithIntervals {
  id: number;
  course_type: number;
  is_flexible: boolean;
  intervals_config_mode: 'unified' | 'independent';
  sport_id: number;
  school_id: number;
  station_id?: number;
  name: string;
  short_description: string;
  description: string;
  price: number;
  currency: string;
  max_participants: number;
  duration?: string;
  date_start: string;
  date_end: string;
  date_start_res?: string;
  date_end_res?: string;
  hour_min?: string;
  hour_max?: string;
  age_min: number;
  age_max: number;
  confirm_attendance: boolean;
  active: boolean;
  online: boolean;
  unique: boolean;
  options: boolean;
  highlighted: boolean;
  claim_text?: string;
  image?: string;
  translations?: any;
  price_range?: any;
  discounts?: any;
  settings?: any;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
  courseIntervals?: CourseInterval[];
}
