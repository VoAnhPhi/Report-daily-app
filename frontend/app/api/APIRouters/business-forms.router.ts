export const business_forms = {
  base: '/business-forms',
  byId: (id: string) => `/business-forms/${id}`,
  me: '/business-forms/me',
  meDetail: (id: string) => `/business-forms/me/${id}`,
  checkMst: '/business-forms/check-mst',
  lookupMst: '/business-forms/lookup-mst',
} as const;
