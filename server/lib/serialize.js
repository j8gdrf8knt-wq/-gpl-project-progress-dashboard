// Prisma returns bigint for Postgres bigint/bigserial columns, which JSON.stringify
// cannot serialize. Recursively convert every BigInt to a plain Number before responding
// (all ids here are small serial integers, safely within Number.MAX_SAFE_INTEGER).
function toJSONSafe(value) {
  if (typeof value === 'bigint') return Number(value);
  if (Array.isArray(value)) return value.map(toJSONSafe);
  if (value instanceof Date) return value;
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = toJSONSafe(v);
    return out;
  }
  return value;
}

module.exports = { toJSONSafe };
