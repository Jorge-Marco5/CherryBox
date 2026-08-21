/**
 * Escapa comillas simples para su uso en cadenas de JavaScript.
 * @param {string} str - La cadena a escapar.
 * @returns {string} La cadena escapada.
 */
function escapeJS(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'");
}

/**
 * Escapa caracteres HTML para prevenir ataques XSS.
 * @param {string} str - La cadena a escapar.
 * @returns {string} La cadena escapada.
 */
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function (m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m];
    });
}

/**
 * Versión alternativa de escape para contenido de texto en el DOM.
 * @param {string} text - El texto a escapar.
 * @returns {string} El texto escapado.
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Codifica una ruta relativa para ser usada de forma segura en URLs y parámetros de consulta (query params).
 * Codifica cada segmento de la ruta individualmente para mantener los slashes '/' intactos
 * y prevenir que '#', '&', '?' o espacios rompan las peticiones HTTP.
 * @param {string} pathStr - Ruta a codificar.
 * @returns {string} Ruta codificada segura.
 */
function encodePath(pathStr) {
    if (!pathStr) return '';
    return pathStr
        .split('/')
        .map(segment => encodeURIComponent(segment))
        .join('/');
}

window.escapeJS = escapeJS;
window.escapeHTML = escapeHTML;
window.escapeHtml = escapeHtml;
window.encodePath = encodePath;
