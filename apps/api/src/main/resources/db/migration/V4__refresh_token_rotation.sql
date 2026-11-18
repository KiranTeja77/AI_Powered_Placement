-- When a refresh token was replaced by its successor. Unlike revoked_at, this is set only by
-- rotation (not by logout, a family revocation or a deactivation), so a token that was merely
-- rotated out a moment ago can be told apart from one that was deliberately killed.
ALTER TABLE refresh_token ADD COLUMN rotated_at timestamptz;
