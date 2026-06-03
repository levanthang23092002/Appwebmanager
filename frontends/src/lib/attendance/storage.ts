import { ATTENDANCE_STORAGE_KEY } from './config';
import type { AttendanceRecord } from './types';

function readAll(): AttendanceRecord[] {
  try {
    const raw = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AttendanceRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(records: AttendanceRecord[]) {
  localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(records));
}

export function listAttendanceRecords(): AttendanceRecord[] {
  return readAll();
}

export function listRecordsForUser(userId: number): AttendanceRecord[] {
  return readAll().filter((r) => r.userId === userId);
}

export function getRecordForUserDate(userId: number, date: string): AttendanceRecord | undefined {
  return readAll().find((r) => r.userId === userId && r.date === date);
}

export function upsertAttendanceRecord(record: AttendanceRecord): AttendanceRecord {
  const all = readAll();
  const idx = all.findIndex((r) => r.id === record.id);
  if (idx >= 0) all[idx] = record;
  else all.push(record);
  writeAll(all);
  return record;
}

export function newRecordId() {
  return `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
