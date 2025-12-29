import JSZip from 'jszip';
import * as FileSystem from 'expo-file-system';

export async function zipFilesBase64(files: Array<{ name: string; path: string }>, outPath: string) {
	const zip = new JSZip();
	for (const f of files) {
		const b64 = await new FileSystem.File(f.path).base64();
		zip.file(f.name, b64, { base64: true });
	}
	const content = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' });
	const outFile = new FileSystem.File(outPath);
	try { outFile.parentDirectory.create({ intermediates: true, idempotent: true }); } catch {}
	outFile.write(content, { encoding: 'base64' });
	return outFile.uri;
}


