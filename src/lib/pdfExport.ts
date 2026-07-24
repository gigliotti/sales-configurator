import type { jsPDF } from 'jspdf';
import { formatEUR } from './format';
import type { ClientParams, Language, PlacedComponent, ProductionLine } from '../store/types';
import type { TranslateFn } from './csvExport';

export interface QuotePdfInput {
  projectName: string;
  clientName: string;
  clientEmail: string;
  params: ClientParams;
  lines: ProductionLine[];
  placedComponents: PlacedComponent[];
  totalPrice: number;
  language: Language;
  t: TranslateFn;
  /** Data-URL PNG de la escena 3D (opcional). */
  image?: string | null;
  /** UUID del proyecto guardado; se usa para el número corto de cotización. */
  projectId?: string | null;
}

// Paleta corporativa (mismos valores que index.css)
const ORANGE: [number, number, number] = [242, 139, 5];
const DARK: [number, number, number] = [11, 15, 25];

const PAGE_WIDTH = 210;
const MARGIN = 15;
const CONTENT_RIGHT = PAGE_WIDTH - MARGIN;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const PAGE_BREAK_Y = 278;

/** Carga una imagen como data-URL con sus dimensiones naturales. Devuelve null si falla. */
async function loadImageAsDataUrl(url: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error(`No se pudo decodificar la imagen: ${url}`));
      img.src = dataUrl;
    });
    if (!dims.width || !dims.height) return null;
    return { dataUrl, ...dims };
  } catch {
    return null;
  }
}

/** Nombre legible de la ubicación de un componente. */
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

/** Recorta un texto a una línea que quepa en maxWidth (mm), agregando elipsis si hace falta. */
function fitText(doc: jsPDF, text: string, maxWidth: number): string {
  const parts = doc.splitTextToSize(text, maxWidth) as string[];
  if (parts.length <= 1) return text;
  return `${parts[0]}...`;
}

/** Salta de página si no queda espacio suficiente; devuelve la nueva coordenada Y. */
function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_BREAK_Y) {
    doc.addPage();
    return 20;
  }
  return y;
}

/**
 * Genera y descarga el PDF de cotización (A4 vertical, estética Verbruggen).
 * Todos los textos visibles se resuelven vía t() (claves pdf.*).
 */
export async function generateQuotePdf(input: QuotePdfInput): Promise<void> {
  const {
    projectName,
    clientName,
    clientEmail,
    params,
    lines,
    placedComponents,
    totalPrice,
    language,
    t,
    image = null,
    projectId = null,
  } = input;

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const locale = language === 'es' ? 'es-ES' : 'en-GB';

  // ---------- Header: barra oscura + logo + marca ----------
  const logo = await loadImageAsDataUrl('/logo_verbruggen.png');

  doc.setFillColor(DARK[0], DARK[1], DARK[2]);
  doc.rect(0, 0, PAGE_WIDTH, 25, 'F');

  let brandX = MARGIN;
  if (logo) {
    try {
      const logoH = 12;
      const logoW = (logo.width / logo.height) * logoH;
      doc.addImage(logo.dataUrl, 'PNG', MARGIN, 6.5, logoW, logoH);
      brandX = MARGIN + logoW + 5;
    } catch {
      // Si el logo no puede incrustarse, continuamos sin él.
      brandX = MARGIN;
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(t('pdf.brand', 'VERBRUGGEN PALLETIZING'), brandX, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
  doc.text(t('pdf.subtitle', 'CONFIGURADOR DE VENTAS 3D'), CONTENT_RIGHT, 16, { align: 'right' });

  // ---------- Título y metadatos ----------
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(t('pdf.quote_title', 'Cotización de Línea de Paletizado').toUpperCase(), MARGIN, 37);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`${t('pdf.project', 'Proyecto')}: ${projectName}`, MARGIN, 45);
  doc.text(`${t('pdf.date', 'Fecha')}: ${new Date().toLocaleDateString(locale)}`, MARGIN, 50);
  if (projectId) {
    doc.text(
      `${t('pdf.quote_number', 'N.º de Cotización')}: #${projectId.slice(0, 8).toUpperCase()}`,
      MARGIN,
      55
    );
  }

  // ---------- Bloque de datos del cliente ----------
  doc.setFillColor(245, 247, 250);
  doc.rect(120, 33, 75, 24, 'F');
  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(t('pdf.client_details', 'Datos del Cliente'), 124, 39);
  doc.setFont('helvetica', 'normal');
  doc.text(
    fitText(doc, `${t('pdf.client_name', 'Nombre')}: ${clientName || t('pdf.na', 'N/D')}`, 68),
    124,
    45
  );
  doc.text(
    fitText(doc, `${t('pdf.client_email', 'Correo')}: ${clientEmail || t('pdf.na', 'N/D')}`, 68),
    124,
    50
  );

  let y = 62;

  // ---------- Captura de la escena 3D ----------
  if (image) {
    doc.setFillColor(235, 240, 245);
    doc.rect(MARGIN, y, CONTENT_WIDTH, 80, 'F');
    try {
      doc.addImage(image, 'PNG', MARGIN, y, CONTENT_WIDTH, 80);
    } catch {
      // Captura inválida: dejamos el marco vacío.
    }
    y += 88;
  }

  // ---------- Parámetros del proyecto ----------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.text(t('pdf.params_title', 'Parámetros del Proyecto'), MARGIN, y);
  y += 6;

  const productTypeLabel =
    params.productType === 'BOLSA' ? t('product_type.bolsa', 'Bolsa') : t('product_type.caja', 'Caja');
  const wrapLabel =
    params.preferredWrapType === 'FILM'
      ? t('wrap_type.film_desc', 'Film Estirable Tradicional')
      : t('wrap_type.red_desc', 'Funda Elástica / Red (Stretch Hood)');

  const leftParams = [
    `• ${t('pdf.param_format', 'Formato de Producto')}: ${productTypeLabel}`,
    `• ${t('pdf.param_product_dims', 'Medidas del Producto (mm)')}: ${params.productLength} x ${params.productWidth} x ${params.productHeight}`,
    `• ${t('pdf.param_weight', 'Peso del Producto (kg)')}: ${params.productWeight}`,
    `• ${t('pdf.param_speed', 'Velocidad Requerida (u/min)')}: ${params.desiredSpeed}`,
  ];
  const rightParams = [
    `• ${t('pdf.param_pallet_dims', 'Dimensiones del Pallet (mm)')}: ${params.palletLength} x ${params.palletWidth}`,
    `• ${t('pdf.param_units_layer', 'Unidades por Capa')}: ${params.unitsPerLayer}`,
    `• ${t('pdf.param_load_height', 'Altura de Carga (mm)')}: ${params.totalPalletHeight}`,
    `• ${t('pdf.param_wrap', 'Envoltura')}: ${fitText(doc, wrapLabel, 60)}`,
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  leftParams.forEach((line, i) => doc.text(fitText(doc, line, 92), MARGIN, y + i * 5));
  rightParams.forEach((line, i) => doc.text(fitText(doc, line, 85), 110, y + i * 5));
  y += leftParams.length * 5 + 8;

  // ---------- Tabla de módulos ----------
  y = ensureSpace(doc, y, 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.text(t('pdf.modules_title', 'Módulos Configurados'), MARGIN, y);
  y += 3;

  const drawTableHeader = (yy: number): number => {
    doc.setFillColor(240, 240, 240);
    doc.rect(MARGIN, yy, CONTENT_WIDTH, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(DARK[0], DARK[1], DARK[2]);
    doc.text(t('pdf.table_module', 'Módulo / Componente'), 18, yy + 4);
    doc.text(t('pdf.table_code', 'Código ERP'), 78, yy + 4);
    doc.text(t('pdf.table_location', 'Ubicación'), 106, yy + 4);
    doc.text(t('pdf.table_base_price', 'Precio Base'), 168, yy + 4, { align: 'right' });
    doc.text(t('pdf.table_subtotal', 'Subtotal'), CONTENT_RIGHT - 2, yy + 4, { align: 'right' });
    return yy + 10;
  };
  y = drawTableHeader(y);

  lines.forEach((line, idx) => {
    const lineComponents = placedComponents.filter(
      (c) => c.lineId === line.id || (!c.lineId && idx === 0)
    );
    if (lineComponents.length === 0) return;

    // Nombre de la línea de producción
    y = ensureSpace(doc, y, 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
    doc.text(line.name, MARGIN, y);
    y += 5;

    let lineSubtotal = 0;

    lineComponents.forEach((c) => {
      lineSubtotal += c.totalPrice;
      y = ensureSpace(doc, y, 7 + c.options.length * 4);

      // Fila principal del componente
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.text(fitText(doc, c.name, 56), 18, y);
      doc.text(c.code || '-', 78, y);
      doc.text(fitText(doc, locationLabel(c.locationId, t), 34), 106, y);
      doc.text(formatEUR(c.basePrice, language), 168, y, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(formatEUR(c.totalPrice, language), CONTENT_RIGHT - 2, y, { align: 'right' });
      y += 4.5;

      // Subfilas: una por opción, con su precio
      if (c.options.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(125, 125, 125);
        c.options.forEach((o) => {
          y = ensureSpace(doc, y, 5);
          doc.text(fitText(doc, `+ ${o.name}`, 105), 22, y);
          doc.text(`+${formatEUR(o.price, language)}`, CONTENT_RIGHT - 2, y, { align: 'right' });
          y += 4;
        });
      }

      doc.setDrawColor(230, 230, 230);
      doc.line(MARGIN, y - 1.5, CONTENT_RIGHT, y - 1.5);
      y += 2;
    });

    // Subtotal de la línea de producción
    y = ensureSpace(doc, y, 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(DARK[0], DARK[1], DARK[2]);
    doc.text(
      fitText(doc, `${t('pdf.line_subtotal', 'Subtotal de línea')} (${line.name}):`, 90),
      160,
      y,
      { align: 'right' }
    );
    doc.text(formatEUR(lineSubtotal, language), CONTENT_RIGHT - 2, y, { align: 'right' });
    y += 9;
  });

  // ---------- Total ----------
  y = ensureSpace(doc, y, 14);
  doc.setFillColor(DARK[0], DARK[1], DARK[2]);
  doc.rect(MARGIN, y, CONTENT_WIDTH, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(t('pdf.total_label', 'Precio Total Estimado').toUpperCase(), 20, y + 6.5);
  doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
  doc.text(formatEUR(totalPrice, language), CONTENT_RIGHT - 5, y + 6.5, { align: 'right' });

  // ---------- Guardar ----------
  const safeName = (projectName || 'cotizacion').replace(/\s+/g, '_');
  const quoteSuffix = projectId ? `_${projectId.slice(0, 8).toUpperCase()}` : '';
  doc.save(`${safeName}${quoteSuffix}_Cotizacion.pdf`);
}
