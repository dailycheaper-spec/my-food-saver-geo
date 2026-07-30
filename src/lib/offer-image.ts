// Shared TTL for offer-image signed URLs.
// Rationale: bucket is private (workspace policy blocks public buckets).
// We sign for a bounded window and cache in the DB (offers.image_url +
// image_signed_url_expires_at), refreshing lazily via a cron before expiry.
export const OFFER_IMAGE_SIGN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
export const OFFER_IMAGE_REFRESH_LEAD_SECONDS = 60 * 60 * 24 * 3; // refresh within 3d of expiry
