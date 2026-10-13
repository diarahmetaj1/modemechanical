// TODO(owner): add real customer reviews (for example from Yelp or Google).
// The live site's testimonials were placeholder content from the theme demo and are intentionally not migrated.
// The Testimonials section stays hidden while this list is empty.
export interface Testimonial { name: string; role?: string; quote: string; rating?: number; source?: string }
export const testimonials: Testimonial[] = [];
