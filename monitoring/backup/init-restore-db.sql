CREATE SCHEMA restore_guard;
CREATE TABLE restore_guard.disposable_target (marker text PRIMARY KEY);
INSERT INTO restore_guard.disposable_target VALUES ('meal-plan-restore-check');
