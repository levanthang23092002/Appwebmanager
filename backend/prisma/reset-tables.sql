-- Chạy trong MySQL Workbench (database entdash) nếu cần reset hoàn toàn, sau đó: npm run db:push
-- Schema mới: Cost.userId, Task.assignerId, Task.description
USE entdash;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `AffiliateTx`;
DROP TABLE IF EXISTS `Task`;
DROP TABLE IF EXISTS `Cost`;
DROP TABLE IF EXISTS `User`;
SET FOREIGN_KEY_CHECKS = 1;
