-- True from the moment an administrator creates a staff account until its owner chooses a password
-- from the emailed link. Existing accounts either chose their own password or registered themselves.
ALTER TABLE app_user ADD COLUMN invite_pending boolean NOT NULL DEFAULT false;
