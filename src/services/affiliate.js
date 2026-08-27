/** Deliberately inactive commerce boundary. No real retailer or affiliate URLs exist in Phase 1. */
export function purchaseOptions(product) {
  return product.retailers?.filter(link => link.active && link.affiliateUrl) ?? [];
}
