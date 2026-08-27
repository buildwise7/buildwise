/** Domain contracts for the future product database and retailer integration. */
export type ProductCategory = 'cpu' | 'cooler' | 'motherboard' | 'ram' | 'gpu' | 'storage' | 'psu' | 'case' | 'fans' | 'monitor' | 'keyboard' | 'mouse' | 'headset';
export interface Price { amount: number; currency: 'GBP'; isLive: boolean; lastChecked?: string; }
export interface Retailer { id?: string; name: string; url?: string; active: boolean; }
export interface AffiliateLink { retailerId: string; destinationUrl?: string; affiliateUrl?: string; active: boolean; }
export interface ProductAvailability { status: 'mock' | 'in-stock' | 'out-of-stock' | 'unknown'; updatedAt: string | null; }
export interface ProductSpecification { socket?: string; memory?: 'DDR4' | 'DDR5'; formFactor?: string; power?: number; length?: number; capacity?: number; [key: string]: string | number | boolean | string[] | undefined; }
export interface Product { id: string; category: ProductCategory; name: string; manufacturer: string; price: Price; specs: ProductSpecification; availability: ProductAvailability; retailerLinks: AffiliateLink[]; image: string | null; }
export interface BuildImage { url: string; alt: string; source: 'manufacturer' | 'builder-render' | 'user-upload'; }
export interface BuildPresentation { buildImage: BuildImage | null; }
export interface CompatibilityRules { cpuMotherboardSocket: boolean; memoryGeneration: boolean; gpuCaseClearance: boolean; psuSafetyMargin: number; }
