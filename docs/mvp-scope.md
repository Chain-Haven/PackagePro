# PackagePro MVP Scope

## Core Flow

```
Scan order → Record video → Print label → Upload → Attach to Woo → Email customer
```

The MVP delivers this end-to-end flow for a single organization with multiple stores and packing stations.

---

## MVP Includes

| Area | Scope |
|------|-------|
| **Tenancy** | Single org, multi-store, multi-station |
| **Order sync** | WooCommerce webhooks → backend → `orders` table |
| **Video capture** | Webcam recording, transcode, upload to Supabase Storage |
| **ShipStation** | Label creation, rates, printing via desktop |
| **Customer email** | Plugin sends email via WC Mailer with secure viewer link |
| **Viewer** | Token-based secure video playback (signed URLs, 1hr expiry) |

---

## MVP Excludes

| Area | Reason |
|------|--------|
| **AI features** | Multi-order detection, label blur, etc. — post-MVP |
| **Advanced analytics** | Dashboards, funnel analysis — post-MVP |
| **Mobile app** | Desktop-only for MVP |
| **Mux / Cloudflare Stream** | Supabase Storage + signed URLs for MVP |
| **Item-level scan verification** | Order-level only for MVP |

---

## Acceptance Criteria

1. **Org setup:** Admin can create an org, add stores (WooCommerce credentials), and create stations.
2. **Station pairing:** Desktop app pairs with a station via short-lived code; pairing persists.
3. **Order sync:** Orders from WooCommerce appear in the desktop queue within 2 minutes of status change.
4. **Order locking:** Packer can lock an order to their station; one active lock per order.
5. **Video capture:** Packer can start/stop recording; video is transcoded and uploaded to Supabase Storage.
6. **Label printing:** Packer can request ShipStation label and print it from the desktop app.
7. **Video attachment:** After upload, video is attached to the WooCommerce order via plugin callback.
8. **Customer email:** Plugin sends email to customer with secure viewer link (WC Mailer).
9. **Viewer access:** Customer can watch video via token link; signed URL expires in 1 hour.
10. **No direct WooCommerce/ShipStation from desktop:** All external API calls go through the backend.
11. **Secrets server-side:** No WooCommerce or ShipStation credentials on the desktop.
12. **RLS enforced:** Users see only data for organizations they belong to.

---

## Out of Scope (Post-MVP)

- Secondary verification (email + ZIP) for video access
- AI-powered multi-order detection
- Label blur / PII redaction
- Mobile packing app
- Advanced retention policies
- Mux/Cloudflare Stream migration
- Item-level scan verification

---

*See also: [Architecture](./architecture.md), [Implementation Plan](./implementation-plan.md)*
