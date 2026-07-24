import { formatEUR } from './format';
import type { Language, PlacedComponent, ProductionLine } from '../store/types';

/** Firma del traductor del store (t). */
export type TranslateFn = (key: string, fallback?: string, params?: Record<string, string | number>) => string;

export interface BomCsvInput {
  projectName: string;
  lines: ProductionLine[];
  placedComponents: PlacedComponent[];
  t: TranslateFn;
  language: Language;
}

/** Nombre legible de la ubicación de un componente en la línea. */
function locationLabel(locationId: number, t: TranslateFn): string {
  switch (locationId) {
    case 0:
      return t('location.pallet_infeed', 'Entrada de Pallets');
    case 1:
      return t('location.pallet_outfeed', 'Salida de Pallets');
    case 2:
      return t('location.product_infeed', 'Entrada de Producto');
    default:
      return t('location.others', 'Otros');
  }
}

/** Escapa un campo CSV: comillas dobles si contiene separador, comillas o saltos de línea. */
function csvField(value: string): string {
  // Neutraliza la inyección de fórmulas: Excel ejecuta celdas que empiezan
  // por =, +, -, @ o tabulador; prefijar una comilla simple fuerza texto.
  const safe = /^[=+\-@\t]/.test(value) ? `'${value}` : value;
  if (/[";\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/**
 * Exporta el BOM (lista de materiales) del proyecto como CSV descargable.
 * Separador ';' y BOM UTF-8 (U+FEFF) para que Excel lo abra correctamente.
 */
export function exportBomCsv({ projectName, lines, placedComponents, t, language }: BomCsvInput): void {
  const headers = [
    t('csv.header_line', 'Línea'),
    t('csv.header_module', 'Módulo'),
    t('csv.header_code', 'Código ERP'),
    t('csv.header_type', 'Tipo'),
    t('csv.header_location', 'Ubicación'),
    t('csv.header_options', 'Opciones'),
    t('csv.header_base_price', 'Precio base'),
    t('csv.header_options_price', 'Precio opciones'),
    t('csv.header_subtotal', 'Subtotal'),
  ];

  const rows: string[][] = [headers];

  lines.forEach((line, idx) => {
    const lineComponents = placedComponents.filter(
      (c) => c.lineId === line.id || (!c.lineId && idx === 0)
    );

    lineComponents.forEach((c) => {
      const optionsPrice = c.options.reduce((sum, o) => sum + o.price, 0);
      rows.push([
        line.name,
        c.name,
        c.code || '',
        t(`component.${c.componentType}`, c.componentType),
        locationLabel(c.locationId, t),
        c.options.map((o) => o.name).join(', ') || t('pdf.options_none', 'Sin opciones'),
        formatEUR(c.basePrice, language),
        formatEUR(optionsPrice, language),
        formatEUR(c.totalPrice, language),
      ]);
    });
  });

  const csvContent = String.fromCharCode(0xFEFF) + rows.map((row) => row.map(csvField).join(';')).join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${(projectName || 'proyecto').replace(/\s+/g, '_')}_BOM.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
