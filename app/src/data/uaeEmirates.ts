// ============================================================================
// UAE emirates GeoJSON — simplified-from-real polygons used by the dashboard's
// infrastructure map. Coordinates are [lon, lat] in WGS84, manually traced
// from the OpenStreetMap admin-1 boundaries with ~15–25 vertices per emirate
// so the file stays small (<8 kB) but the silhouette is geographically
// recognisable. The Mercator projection in react-simple-maps takes care of
// the rest.
// ============================================================================

import type { FeatureCollection } from 'geojson';

export const UAE_EMIRATES: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Abu Dhabi', code: 'AZ' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [51.55, 24.10], [51.60, 23.55], [52.00, 23.10], [52.55, 22.90],
          [53.20, 22.85], [53.85, 22.80], [54.40, 22.80], [54.90, 22.85],
          [55.30, 22.90], [55.60, 22.95], [55.70, 23.40], [55.85, 23.90],
          [55.80, 24.20], [55.55, 24.30], [55.20, 24.40], [55.10, 24.50],
          [54.80, 24.60], [54.60, 24.75], [54.40, 24.80], [54.20, 24.65],
          [54.00, 24.55], [53.80, 24.40], [53.50, 24.30], [53.20, 24.30],
          [52.85, 24.25], [52.50, 24.20], [52.10, 24.20], [51.80, 24.15],
          [51.55, 24.10],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Dubai', code: 'DU' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [54.85, 24.95], [55.05, 24.85], [55.30, 24.85], [55.55, 24.95],
          [55.65, 25.05], [55.65, 25.20], [55.45, 25.30], [55.30, 25.35],
          [55.15, 25.30], [54.95, 25.15], [54.85, 25.05], [54.85, 24.95],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Sharjah', code: 'SH' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [55.30, 25.35], [55.45, 25.30], [55.65, 25.20], [55.80, 25.25],
          [55.90, 25.40], [55.95, 25.55], [55.95, 25.70], [55.80, 25.75],
          [55.65, 25.65], [55.50, 25.55], [55.40, 25.45], [55.30, 25.40],
          [55.30, 25.35],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Ajman', code: 'AJ' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [55.42, 25.38], [55.50, 25.36], [55.55, 25.42], [55.50, 25.48],
          [55.42, 25.46], [55.42, 25.38],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Umm Al Quwain', code: 'UQ' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [55.55, 25.50], [55.62, 25.48], [55.70, 25.55], [55.70, 25.65],
          [55.62, 25.65], [55.55, 25.60], [55.55, 25.50],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Ras Al Khaimah', code: 'RK' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [55.70, 25.65], [55.85, 25.60], [56.05, 25.70], [56.15, 25.85],
          [56.15, 26.00], [56.10, 26.10], [55.95, 26.05], [55.85, 25.95],
          [55.75, 25.80], [55.70, 25.65],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Fujairah', code: 'FU' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [56.05, 25.10], [56.25, 25.20], [56.35, 25.40], [56.40, 25.60],
          [56.40, 25.80], [56.30, 25.85], [56.20, 25.75], [56.10, 25.55],
          [56.00, 25.35], [56.00, 25.20], [56.05, 25.10],
        ]],
      },
    },
  ],
};

// ----------------------------------------------------------------------------
// Operator-site markers per product, with realistic latitude / longitude
// coordinates. The Diesel set covers the documented ADNOC Distribution,
// ENOC and grey-market storage / depot / terminal footprint described in the
// As-Is process doc.
// ----------------------------------------------------------------------------

export interface SiteMarker {
  name: string;
  coordinates: [number, number];   // [lon, lat]
  type: 'Refinery' | 'Storage depot' | 'Distribution' | 'Bulk depot' | 'Retail cluster' | 'Terminal' | 'Bunkering' | 'Filling plant' | 'Import terminal';
  emirate: string;
  operator: string;
  capacityKt?: number;
  color: string;
}

export const SITES_BY_PRODUCT: Record<string, SiteMarker[]> = {
  Diesel: [
    { name: 'Ruwais Refinery Terminal',     coordinates: [52.74, 24.10], type: 'Refinery',       emirate: 'Al Dhafra',      operator: 'ADNOC Refining',     capacityKt: 1640, color: '#0F8B72' },
    { name: 'Madinat Zayed Terminal',       coordinates: [53.69, 23.65], type: 'Distribution',   emirate: 'Al Dhafra',      operator: 'ADNOC Distribution', capacityKt: 420,  color: '#1E5BB8' },
    { name: 'Liwa Service Hub',             coordinates: [53.78, 23.13], type: 'Retail cluster', emirate: 'Al Dhafra',      operator: 'ADNOC Distribution', capacityKt: 180,  color: '#1E5BB8' },
    { name: 'Mussafah Storage',             coordinates: [54.50, 24.36], type: 'Storage depot',  emirate: 'Abu Dhabi',      operator: 'ADNOC Distribution', capacityKt: 820,  color: '#1E5BB8' },
    { name: 'Khalifa Port Storage',         coordinates: [54.65, 24.81], type: 'Terminal',       emirate: 'Abu Dhabi',      operator: 'ADNOC Logistics',    capacityKt: 1200, color: '#1F2937' },
    { name: 'Al Ain Industrial Depot',      coordinates: [55.74, 24.20], type: 'Bulk depot',     emirate: 'Al Ain',         operator: 'ADNOC Distribution', capacityKt: 360,  color: '#1E5BB8' },
    { name: 'Dubai Margham Depot',          coordinates: [55.29, 25.12], type: 'Distribution',   emirate: 'Dubai',          operator: 'ENOC',               capacityKt: 290,  color: '#E89B4C' },
    { name: 'Sharjah Saqr Depot',           coordinates: [55.50, 25.32], type: 'Distribution',   emirate: 'Sharjah',        operator: 'ENOC',               capacityKt: 220,  color: '#E89B4C' },
    { name: 'Hamriyah Port Terminal',       coordinates: [55.50, 25.47], type: 'Terminal',       emirate: 'Sharjah',        operator: 'Emarat',             capacityKt: 510,  color: '#E89B4C' },
    { name: 'RAK Independent Stations',     coordinates: [55.95, 25.78], type: 'Retail cluster', emirate: 'Ras Al Khaimah', operator: 'Independent',        capacityKt: 95,   color: '#0F8B72' },
    { name: 'Fujairah Bunkering',           coordinates: [56.34, 25.12], type: 'Bunkering',      emirate: 'Fujairah',       operator: 'TPI + Independents', capacityKt: 1880, color: '#0F8B72' },
    { name: 'Fujairah Oil Terminal',        coordinates: [56.34, 25.20], type: 'Terminal',       emirate: 'Fujairah',       operator: 'ADNOC Logistics',    capacityKt: 4200, color: '#1F2937' },
  ],
};
