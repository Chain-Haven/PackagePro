type VerificationInput = {
  email?: string | null;
  postalCode?: string | null;
  orderEmail?: string | null;
  orderZip?: string | null;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function normalizeZip(value: string) {
  return value.replace(/\s/g, '').toLowerCase();
}

export function verifyViewerAccess({ email, postalCode, orderEmail, orderZip }: VerificationInput) {
  const emailOk = email && orderEmail ? normalize(email) === normalize(orderEmail) : null;
  const zipOk = postalCode && orderZip ? normalizeZip(postalCode) === normalizeZip(orderZip) : null;

  if (emailOk !== null && zipOk !== null) {
    return emailOk && zipOk;
  }

  return emailOk ?? zipOk ?? false;
}
