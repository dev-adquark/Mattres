/** Validate the bearer token sent by the platform scheduler. */
export function isAuthorizedCronRequest(headers, secret) {
  if (typeof secret !== 'string' || secret.length === 0) return false;
  const authorization = headers?.get?.('authorization');
  if (typeof authorization !== 'string') return false;
  return authorization === `Bearer ${secret}`;
}
