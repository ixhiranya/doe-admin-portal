export interface FormulaDef {
  id: string;
  name: string;
  expression: string;
  company: string; // 'All Companies' | one of COMPANY_OPTIONS
  product: string; // 'All Products' | one of PRODUCT_OPTIONS
  description?: string;
}

// Default formula master — placeholder data until the Formula Configuration
// module is wired to a real DB table.
export const DEFAULT_FORMULAS: FormulaDef[] = [
  { id: 'FRM-001', name: 'Total Supply', expression: 'local_production + imports', company: 'All Companies', product: 'All Products', description: 'Local production plus imports.' },
  { id: 'FRM-002', name: 'Total Demand', expression: 'commercial + industrial + government + road_transport + aviation + marine_transport', company: 'All Companies', product: 'All Products', description: 'Sum of all demand-side sectors.' },
  { id: 'FRM-003', name: 'Net Stock Change', expression: 'opening_stock - closing_stock', company: 'All Companies', product: 'All Products', description: 'Movement in stock over the reporting period.' },
  { id: 'FRM-004', name: 'Diesel Balance (ADNOC)', expression: 'total_supply - total_demand', company: 'ADNOC', product: 'Diesel', description: 'Supply/demand balance check for ADNOC diesel submissions.' },
  { id: 'FRM-005', name: 'Gasoline Balance (ADNOC)', expression: 'total_supply - total_demand', company: 'ADNOC', product: 'Gasoline', description: 'Supply/demand balance check for ADNOC gasoline submissions.' },
  { id: 'FRM-006', name: 'Diesel Balance (ENOC)', expression: 'total_supply - total_demand', company: 'ENOC', product: 'Diesel', description: 'Supply/demand balance check for ENOC diesel submissions.' },
  { id: 'FRM-007', name: 'Transport Share', expression: '(road_transport + marine_transport) / total_demand * 100', company: 'All Companies', product: 'All Products', description: 'Transport sector as a % of total demand.' },
  { id: 'FRM-008', name: 'Grey Market Variance', expression: 'commercial - industrial', company: 'Grey Market', product: 'Diesel', description: 'Grey-market-specific variance check.' },
];
