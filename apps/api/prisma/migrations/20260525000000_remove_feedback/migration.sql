-- Drop indexes
DROP INDEX IF EXISTS "feedback_created_at_idx";
DROP INDEX IF EXISTS "feedback_priority_idx";
DROP INDEX IF EXISTS "feedback_status_idx";
DROP INDEX IF EXISTS "feedback_type_idx";
DROP INDEX IF EXISTS "feedback_workspace_idx";

-- Drop Feedback table and its enums
DROP TABLE IF EXISTS "Feedback";

DROP TYPE IF EXISTS "FeedbackCategory";
DROP TYPE IF EXISTS "FeedbackPriority";
DROP TYPE IF EXISTS "FeedbackStatus";
DROP TYPE IF EXISTS "FeedbackType";
