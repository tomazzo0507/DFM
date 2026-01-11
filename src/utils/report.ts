import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

export async function getLogoBase64(): Promise<string | null> {
	// Attempt to resolve CIAC logo from assets
	// #region agent log
	fetch('http://127.0.0.1:7242/ingest/709a9087-e502-4aa0-ab64-32ebb867cef1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'H4',location:'report.ts:getLogoBase64:entry',message:'enter getLogoBase64 using Asset.fromModule',data:{},timestamp:Date.now()})}).catch(()=>{});
	// #endregion
	
	try {
		// FIX: Use Asset.fromModule directly - should work now that filename has no spaces
		const requireResult = require('../../assets/ciac_logo.png');
		
		// #region agent log
		fetch('http://127.0.0.1:7242/ingest/709a9087-e502-4aa0-ab64-32ebb867cef1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'H4',location:'report.ts:getLogoBase64:requireResult',message:'require result',data:{requireResult:JSON.stringify(requireResult)},timestamp:Date.now()})}).catch(()=>{});
		// #endregion
		
		// Use Asset.fromModule directly (compatible with all Expo versions)
		const asset = Asset.fromModule(requireResult);
		
		// #region agent log
		fetch('http://127.0.0.1:7242/ingest/709a9087-e502-4aa0-ab64-32ebb867cef1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'H4',location:'report.ts:getLogoBase64:assetFromModule',message:'asset created from module',data:{assetUri:asset.uri},timestamp:Date.now()})}).catch(()=>{});
		// #endregion
		
		// #region agent log
		fetch('http://127.0.0.1:7242/ingest/709a9087-e502-4aa0-ab64-32ebb867cef1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'H4',location:'report.ts:getLogoBase64:beforeDownloadAsync',message:'before downloadAsync',data:{assetUri:asset.uri},timestamp:Date.now()})}).catch(()=>{});
		// #endregion
		
		await asset.downloadAsync();
		
		// #region agent log
		fetch('http://127.0.0.1:7242/ingest/709a9087-e502-4aa0-ab64-32ebb867cef1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'H4',location:'report.ts:getLogoBase64:afterDownloadAsync',message:'after downloadAsync',data:{localUri:asset.localUri},timestamp:Date.now()})}).catch(()=>{});
		// #endregion
		
		if (asset.localUri) {
			const b64 = await new FileSystem.File(asset.localUri).base64();
			// #region agent log
			fetch('http://127.0.0.1:7242/ingest/709a9087-e502-4aa0-ab64-32ebb867cef1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'H4',location:'report.ts:getLogoBase64:success',message:'logo loaded successfully',data:{base64Length:b64.length},timestamp:Date.now()})}).catch(()=>{});
			// #endregion
			return `data:image/png;base64,${b64}`;
		}
	} catch (error) {
		// #region agent log
		const errorDetails = {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			errorType: error?.constructor?.name,
			errorString: String(error)
		};
		fetch('http://127.0.0.1:7242/ingest/709a9087-e502-4aa0-ab64-32ebb867cef1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'H4',location:'report.ts:getLogoBase64:error',message:'error loading logo',data:errorDetails,timestamp:Date.now()})}).catch(()=>{});
		// #endregion
		
		// Log error but don't fail PDF generation - logo is optional
		console.warn('Failed to load CIAC logo for PDF:', error instanceof Error ? error.message : String(error));
	}
	
	// #region agent log
	fetch('http://127.0.0.1:7242/ingest/709a9087-e502-4aa0-ab64-32ebb867cef1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'H4',location:'report.ts:getLogoBase64:exit',message:'exit getLogoBase64 returning null',data:{},timestamp:Date.now()})}).catch(()=>{});
	// #endregion
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
	// CRITICAL FIX: Remove logo references if logo is not available
	// This prevents broken image references that can break PDF generation
	let processedBody = bodyInner;
	if (!logoDataUrl) {
		// Remove all logo img tags completely if logo is not available
		processedBody = processedBody.replace(/<img[^>]*class="logo"[^>]*>/g, '');
		// Remove logo img tags by src attribute as well
		processedBody = processedBody.replace(/<img[^>]*src="[^"]*ciac_logo[^"]*"[^>]*>/g, '');
		// Replace empty img-cell td with empty td
		processedBody = processedBody.replace(/<td[^>]*class="[^"]*img-cell[^"]*"[^>]*>[\s\S]*?<\/td>/g, '<td class="col1"></td>');
	} else {
		// Replace logo references with data URL
		processedBody = processedBody.replaceAll('/assets/ciac_logo.png', logoDataUrl);
		processedBody = processedBody.replace(/src="[^"]*ciac_logo[^"]*"/g, `src="${logoDataUrl}"`);
	}
	
	return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <style>${REPORT_CSS}</style>
</head>
<body>
  ${processedBody}
  <br class="page-break">
</body>
</html>`;
}

/**
 * Sanitizes a base64 data URI for safe use in HTML
 * Returns null if the signature is invalid
 */
export function sanitizeSignature(signature: string | null | undefined): string | null {
	if (!signature || typeof signature !== 'string') return null;
	
	// Check if it's a valid data URI
	if (!signature.startsWith('data:image/')) return null;
	
	// Extract base64 part
	const base64Match = signature.match(/data:image\/[^;]+;base64,(.+)/);
	if (!base64Match || !base64Match[1]) return null;
	
	const base64Data = base64Match[1];
	
	// Validate base64 characters (alphanumeric, +, /, =)
	if (!/^[A-Za-z0-9+/=]+$/.test(base64Data)) return null;
	
	// Limit size (prevent extremely large signatures from breaking PDF)
	if (base64Data.length > 500000) { // ~375KB
		console.warn('Signature too large, truncating');
		return signature.substring(0, 100000); // Keep first part
	}
	
	return signature;
}


