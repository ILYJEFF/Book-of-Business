/** Typical business departments for the contact profile dropdown. */
export const BUSINESS_DEPARTMENTS = [
  'Executive / leadership',
  'Operations',
  'Sales',
  'Marketing',
  'Customer success',
  'Engineering / IT',
  'Product',
  'Finance / accounting',
  'Human resources',
  'Legal / compliance',
  'Procurement / supply chain',
  'Research & development',
  'Administration'
] as const

export const BUSINESS_DEPARTMENT_SET = new Set<string>(BUSINESS_DEPARTMENTS)
