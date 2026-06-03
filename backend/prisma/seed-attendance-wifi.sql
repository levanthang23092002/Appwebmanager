-- Thêm WiFi công ty vào bảng CompanyWifi (chạy trong MySQL / phpMyAdmin)
-- Ví dụ:

INSERT INTO CompanyWifi (ssid, label, active, createdAt, updatedAt)
VALUES
  ('EagleRise-Office', 'WiFi văn phòng', 1, NOW(), NOW()),
  ('EagleRise_5G', 'WiFi 5G', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  active = 1,
  updatedAt = NOW();
