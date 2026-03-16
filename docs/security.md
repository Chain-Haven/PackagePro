# PackagePro Security Model

## Video Access Security

### Storage

- **Private bucket:** All videos stored in a Supabase Storage bucket with no public access
- **No public URLs:** Videos are never exposed via public or listable URLs

### Access Control

| Mechanism | Implementation |
|-----------|----------------|
| **Signed URLs** | Server-generated, 1-hour expiry; no long-lived direct links |
| **Opaque tokens** | 32-byte cryptographically random tokens; only hash stored in DB |
| **Token hashing** | SHA-256 of token stored in `video_access_tokens.token_hash` |
| **Optional verification** | Secondary check (email + ZIP) for high-value orders via `store_settings.require_secondary_verification` |

### Token Flow

```
1. Customer receives email with link: /v/{opaque_token}
2. Viewer page calls backend: POST /api/viewer/verify { token }
3. Backend: hash(token) → lookup in video_access_tokens
4. If valid + not expired: return signed URL (1hr) for video
5. Frontend plays video; no token or raw URL exposed in player
```

---

## Credential Encryption

| Credential | Algorithm | Key |
|------------|-----------|-----|
| ShipStation API key/secret | AES-256-GCM | `ENCRYPTION_KEY` env var |
| WooCommerce consumer key/secret | AES-256-GCM | `ENCRYPTION_KEY` env var |

**Pattern:**

```typescript
// Encrypt before storing
const encrypted = encrypt(plaintext, process.env.ENCRYPTION_KEY);

// Decrypt only when needed (server-side)
const plaintext = decrypt(encrypted, process.env.ENCRYPTION_KEY);
```

Keys are never logged or sent to the desktop app.

---

## Authentication

| Context | Method |
|---------|--------|
| **Admin / internal users** | Supabase Auth (email/password, OAuth) |
| **Desktop app** | Supabase Auth; session used for all API calls |
| **Customer video access** | Opaque tokens only; no Supabase Auth |

---

## Row Level Security (RLS)

- **Scope:** All tenant tables use `org_id` from `memberships` via `auth.uid()`
- **Principle:** Users see only data for organizations they belong to
- **Enforcement:** RLS policies on SELECT, INSERT, UPDATE, DELETE

---

## Plugin Security

| Threat | Mitigation |
|--------|------------|
| **Forged callbacks** | HMAC-SHA256 signed requests with per-store `webhook_secret` |
| **Replay** | Timestamp + nonce in payload; reject old requests |
| **Secret exposure** | `webhook_secret` stored encrypted; never in client |

**Verification pattern:**

```php
$signature = hash_hmac('sha256', $payload, $webhook_secret);
if (!hash_equals($expected, $received)) {
    wp_die('Invalid signature', 403);
}
```

---

## Local Security (Desktop App)

| Concern | Mitigation |
|---------|------------|
| **Temp video files** | AES-256 encrypted on disk before upload |
| **Cleanup** | Temp files deleted immediately after successful upload |
| **Secrets** | No WooCommerce or ShipStation keys stored locally |

---

## Rate Limiting

| Endpoint / Context | Limit |
|--------------------|-------|
| **Viewer (per token)** | 10 requests/minute |
| **API routes (per user)** | Configurable per route (e.g. 100/min for write ops) |

---

## Audit Logging

All sensitive operations are logged to `audit_logs`:

- `video.viewed` — customer video access
- `order.locked` / `order.unlocked`
- `video.uploaded` / `video.attached`
- Credential changes, membership changes

Logs include: `actor_id`, `action`, `resource_type`, `resource_id`, `metadata`, `created_at`.

---

## Privacy

| Practice | Implementation |
|----------|----------------|
| **Audio** | Off by default; configurable per station |
| **Camera** | Aimed at packing area only; no unnecessary capture |
| **Logs** | No raw PII; emails and IPs hashed where stored |
| **Retention** | Configurable `video_retention_days` per store |

---

## Security Checklist

- [ ] No public video URLs or list endpoints for customers
- [ ] All API keys encrypted at rest
- [ ] RLS on all tenant tables
- [ ] Plugin callbacks HMAC-verified
- [ ] Temp videos encrypted and deleted after upload
- [ ] Rate limiting on viewer and API
- [ ] Audit logging on sensitive operations
- [ ] No raw PII in logs

---

*See also: [Architecture](./architecture.md), [Data Model](./data-model.md)*
