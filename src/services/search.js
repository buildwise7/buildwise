/** Attribute-aware global search, ready for a database-backed index later. */
export function searchProducts(products, query) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return products.filter(product => words.every(word => JSON.stringify(product).toLowerCase().includes(word)));
}
