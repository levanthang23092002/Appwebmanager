/** Giờ vào muộn (sau giờ này = trễ) */
export const LATE_AFTER_HOUR = 9;
export const LATE_AFTER_MINUTE = 0;

/** Tên WiFi công ty (hiển thị hướng dẫn; trình duyệt không đọc được SSID) */
export const COMPANY_WIFI_NAMES = (
  import.meta.env.VITE_ATTENDANCE_WIFI_NAMES ||
  'EagleRise-Office,EagleRise_5G'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/** Tiền tố IP mạng nội bộ — bổ sung trong .env khi deploy */
export const ALLOWED_IP_PREFIXES = (
  import.meta.env.VITE_ATTENDANCE_ALLOWED_IPS || '192.168.,10.,172.16.'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const ATTENDANCE_STORAGE_KEY = 'attendance_records_v1';
