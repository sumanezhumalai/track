-- Admin user seed: password_onboard = TRUE so default admin skips onboarding
INSERT INTO "EGS"."devSupport" (dev_name, role, team, created_by, type, password_hash, password_onboard)
VALUES ('admin', 'Lead', 'DevSupport', 'system', 'admin', '$2a$10$yKxNskIqXM7ZdfoB/4L4EOeqoo.0nM318jo0J4e8.8fVKnL/K7ChO', TRUE)
ON CONFLICT (dev_name) DO NOTHING;
