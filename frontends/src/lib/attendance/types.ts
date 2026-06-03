export type AttendanceDayStatus =
  | 'present'
  | 'late'
  | 'absent'
  | 'working'
  | 'leave'
  | 'weekend';

export interface AttendanceRecord {
  id: string;
  userId: number;
  userName: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: AttendanceDayStatus;
  wifiVerified: boolean;
  note?: string;
}

export interface AttendanceUserBrief {
  id: number;
  name: string;
  email: string;
  avatar?: string | null;
  role: string;
}

export interface DaySummary {
  date: string;
  status: AttendanceDayStatus;
  checkIn?: string;
  checkOut?: string;
  record?: AttendanceRecord;
}

export interface TeamMemberRow {
  user: AttendanceUserBrief;
  todayStatus: AttendanceDayStatus;
  todayCheckIn?: string;
  todayCheckOut?: string;
  monthPresent: number;
  monthLate: number;
  monthAbsent: number;
  monthWorkdays: number;
}
