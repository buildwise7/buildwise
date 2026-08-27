/** Data-driven filtering: UI can pass category-aware predicates without knowing product shape. */
export function filterProducts(products, filters = {}) {
  return products.filter(product => Object.entries(filters).every(([key, value]) => {
    if (value === undefined || value === '' || value === 'all') return true;
    const candidate = product.specs[key] ?? product[key];
    return Array.isArray(value) ? value.includes(candidate) : String(candidate).toLowerCase() === String(value).toLowerCase();
  }));
}
