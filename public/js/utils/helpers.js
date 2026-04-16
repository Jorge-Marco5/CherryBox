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

window.escapeJS = escapeJS;
window.escapeHTML = escapeHTML;
window.escapeHtml = escapeHtml;
