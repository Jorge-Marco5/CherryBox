import path from 'path';
/**
 * Verifica la extension real de un archivo
 * @param urlPath 
 */
export function verifyExtensionHelper(urlPath: string){
    const realPath = path.basename(urlPath);
    console.log(realPath);
}