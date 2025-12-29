import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

export async function getLogoBase64(): Promise<string | null> {
	// Attempt to resolve CIAC logo from assets
	try {
		const asset = Asset.fromModule(require('../../assets/ciac logo.png'));
		await asset.downloadAsync();
		if (asset.localUri) {
			const b64 = await new FileSystem.File(asset.localUri).base64();
			return `data:image/png;base64,${b64}`;
		}
	} catch {
		// ignore
	}
	return null;
}

export const REPORT_CSS = `
/* =========================
   RESET Y BASE
========================= */
* {
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  font-family: Arial, sans-serif;
  list-style: none;
  font-size: 12px;
  text-decoration: none;
  scroll-behavior: smooth;
}
::-webkit-scrollbar { display: none; }
html, body {
  margin: 0; padding: 0; height: 100vh; width: 100vw; font-size: 11px;
}
/* =========================
   TABLAS GENERALES
========================= */
table { width: 100vw; border-collapse: collapse; table-layout: fixed; }
th, td { border: 1px solid black; vertical-align: middle; padding: 4px; word-wrap: break-word; }
/* =========================
   COLUMNAS ENCABEZADO
========================= */
.col1 { width: 26%; } .col2 { width: 38%; } .col3 { width: 36%; }
.center { text-align: center; vertical-align: middle; }
/* =========================
   ESTILOS GENERALES
========================= */
.gray { background-color: #838383; font-weight: bold; }
.smallbox { padding: 6px; line-height: 1.4; }
.no-padding { padding: 0 !important; }
.row-compact > td { padding-top: 0; padding-bottom: 0; }
/* =========================
   LOGO
========================= */
.img-cell img:not(.logo) { width: 90%; display: block; margin: 0 auto; }
.logo { width: 150px; height: auto; display: block; margin: 0 auto; }
/* =========================
   TABLA ACUMULADOS (7 COL)
========================= */
.minutes-7col { width: 100%; border-collapse: collapse; table-layout: fixed; }
.minutes-7col th, .minutes-7col td { width: 14.2857%; padding: 4px; border: 1px solid black; text-align: center; }
.minutes-7col tr:first-child th { border-top: 0; }
.minutes-7col tr:last-child td { border-bottom: 0; }
.minutes-7col th:first-child, .minutes-7col td:first-child { border-left: 0; }
.minutes-7col th:last-child, .minutes-7col td:last-child { border-right: 0; }
/* =========================
   SUB-TABLAS INTERNAS
========================= */
.sub-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.sub-table td {
  border: 1px solid black; padding: 2px; font-size: 10px; text-align: center; line-height: 1.2;
}
.sub-table td[colspan] { font-weight: bold; text-align: center; }
/* =========================
   FIRMAS
========================= */
.signatures-simple { width: 100%; border-collapse: collapse; table-layout: fixed; }
.signatures-simple td {
  width: 25%; padding: 6px; border: 1px solid #666; background-color: #f9f9f9; text-align: center; font-size: 11px;
}
.signatures-simple tr:first-child td { height: 80px; vertical-align: middle; }
.signatures-simple tr:nth-child(2) td { text-align: left; }
.signatures-simple tr:first-child td { border-top: 0; }
.signatures-simple tr:last-child td { border-bottom: 0; }
.signatures-simple td:first-child { border-left: 0; }
.signatures-simple td:last-child { border-right: 0; }
.firmas { background-color: #ffffff; }
/* =========================
   SALTO DE PÁGINA PDF
========================= */
.page-break { page-break-after: always; }
/* =========================
   RESPONSIVE (NO CRÍTICO PARA PDF)
========================= */
@media (min-width: 1200px) {
  table { max-width: 1200px; margin: 0 auto; }
  .logo { width: 180px; }
}
@media (max-width: 768px) {
  .logo { width: 100px; }
  th, td { padding: 3px; }
}
@media (max-width: 480px) {
  body { font-size: 8px; }
  .logo { width: 80px; }
}
`;

export function wrapReportHTML(bodyInner: string, logoDataUrl: string | null): string {
	return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <style>${REPORT_CSS}</style>
</head>
<body>
  ${bodyInner.replaceAll('/assets/ciac logo.png', logoDataUrl || '/assets/ciac logo.png')}
  <br class="page-break">
</body>
</html>`;
}


