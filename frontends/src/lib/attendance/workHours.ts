import { LATE_AFTER_HOUR, LATE_AFTER_MINUTE } from './config';

export type AttendanceWorkHours = {
  workStartHour: number;
  workStartMinute: number;
  workEndHour: number;
  workEndMinute: number;
};

export const DEFAULT_WORK_HOURS: AttendanceWorkHours = {
  workStartHour: LATE_AFTER_HOUR,
  workStartMinute: LATE_AFTER_MINUTE,
  workEndHour: 18,
  workEndMinute: 0,
};

let cachedWorkHours: AttendanceWorkHours = DEFAULT_WORK_HOURS;

export function getWorkHours() {
  return cachedWorkHours;
}

export function setWorkHours(settings: AttendanceWorkHours) {
  cachedWorkHours = settings;
}

export function padTimePart(n: number) {
  return String(n).padStart(2, '0');
}

export function formatWorkTime(hour: number, minute: number) {
  return `${padTimePart(hour)}:${padTimePart(minute)}`;
}

export function workHoursToTimeInputValue(hour: number, minute: number) {
  return formatWorkTime(hour, minute);
}

export function parseTimeInputValue(value: string) {
  const [h, m] = value.split(':');
  return {
    hour: parseInt(h || '0', 10) || 0,
    minute: parseInt(m || '0', 10) || 0,
  };
}

export function formatWorkHoursRange(settings: AttendanceWorkHours = cachedWorkHours) {
  return `${formatWorkTime(settings.workStartHour, settings.workStartMinute)} – ${formatWorkTime(settings.workEndHour, settings.workEndMinute)}`;
}
