export interface ScheduleItem {
  id: string;
  subject_name: string;
  start_time: string; // e.g., "08:00" (24-hour format)
  end_time: string;   // e.g., "09:30" (24-hour format)
  room?: string;      // e.g., "Lab 4B"
  instructor?: string; // e.g., "Dr. Aris"
  webhook_url?: string;
  webhook_method?: 'GET' | 'POST';
  webhook_headers?: string;
}

export interface Note {
  id: string;
  schedule_id: string;
  title: string;
  content: string;
  deadline?: string;
  is_done?: boolean;
  notified_thresholds?: ('1d' | '12h' | '6h' | '1h')[];
}

export interface TimelineBlock {
  type: 'event' | 'gap';
  id: string;
  subject_name?: string;
  start_time: string;
  end_time: string;
  durationMinutes: number;
  room?: string;
  instructor?: string;
}

export interface ToastMessage {
  id: string;
  type: 'start' | 'end' | 'system';
  title: string;
  message: string;
  borderColorClass: string;
  dotColor: string;
  timestamp: Date;
}

export type ThemeName = 'dark' | 'light' | 'pink' | 'blue';

export interface ThemeConfig {
  name: ThemeName;
  bgClass: string;
  panelClass: string;
  cardClass: string;
  cardActiveBg: string;
  borderClass: string;
  textBrightClass: string;
  textMutedClass: string;
  textDarkClass: string;
  accentTextClass: string;
  accentBgClass: string;
  accentBorderClass: string;
  accentDotClass: string;
  indicatorLineClass: string;
  indicatorBadgeClass: string;
  indicatorDotClass: string;
  blobColors: string[];
}
