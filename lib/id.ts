/**
 * A random UUID, used as `client_op_id` so a retried request can never create a
 * duplicate. Call this from event handlers only, never while a component renders.
 *
 * crypto.randomUUID() exists only on secure origins (https:// or localhost).
 * Opening the app over plain http on a LAN address would crash without a fallback.
 */
export function newId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return [hex.slice(0, 4), hex.slice(4, 6), hex.slice(6, 8), hex.slice(8, 10), hex.slice(10)]
    .map((part) => part.join(""))
    .join("-");
}
