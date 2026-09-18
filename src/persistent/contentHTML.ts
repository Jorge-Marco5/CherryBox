export const contentHtml = (fileName: string, fileSize: string, escapedContent: string) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileName} - CherryBox</title>
  <style>
    :root {
      --bg: #121212;
      --card-bg: #1e1e1e;
      --card-inner: #181818;
      --text: #f0f0f0;
      --text-muted: #888;
      --primary: #d2042d;
      --primary-hover: #d2042dba;
      --border: #333;
      --success: #22c55e;
      --error: #ef4444;
      --warning: #f59e0b;
      --info: #3b82f6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      background: var(--card-bg);
      border-bottom: 1px solid var(--border);
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      flex-wrap: wrap;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .file-info {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .file-name {
      font-weight: 600;
      font-size: 1.05rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 500px;
      cursor:pointer;
    }
    .file-meta {
      font-size: 0.8rem;
      color: var(--text-muted);
      background: #2a2a2a;
      padding: 2px 8px;
      border-radius: 6px;
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      border: 1px solid var(--border);
      background: #2a2a2a;
      color: var(--text);
      transition: all 0.2s ease;
    }
    .btn:hover {
      background: #333;
      border-color: #555;
    }
    .btn-primary {
      background: var(--primary);
      border-color: var(--primary);
      color: #fff;
    }
    .btn-primary:hover {
      background: var(--primary-hover);
      border-color: var(--primary-hover);
    }

    .btn span{
      font-size: 0.9rem;
    }

    @media (max-width: 768px) {
      header {
        flex-direction: column;
        align-items: start;
        gap: 10px;
      }

      .file-name {
        font-size: 0.9rem;
      }

      .file-meta {
        font-size: 0.8rem;
      }

      .btn span{
        display: none;
      }
      .btn {
        padding: 5px 10px;
      }
    }

    main {
      flex: 1;
      max-width: 1400px;
      width: 100%;
      margin: 0 auto;
    }
    .code-wrapper {
      overflow: hidden;
    }
    pre {
      margin: 0;
      padding: 20px;
      overflow-x: auto;
      font-family: 'Fira Code', Consolas, Monaco, 'Courier New', Courier, monospace;
      font-size: 13.5px;
      line-height: 1.6;
      color: #e6e6e6;
      white-space: pre-wrap;
      word-break: break-word;
    }
    /* Toast Notifications */
#toast-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 50%;
}

.toast {
    background: var(--card-bg);
    color: var(--text);
    padding: 12px 20px;
    border-radius: 8px;
    border-left: 4px solid var(--primary);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 250px;
    max-width: 400px;
    animation: slideIn 0.3s ease-out forwards;
    transition: opacity 0.3s ease, transform 0.3s ease;
    backdrop-filter: blur(10px);
}

.toast.success {
    border-left-color: var(--success);
}

.toast.error {
    border-left-color: var(--error);
}

.toast.warning {
    border-left-color: var(--warning);
}

.toast.info {
    border-left-color: var(--info);
}

.toast.fade-out {
    opacity: 0;
    transform: translateX(100%);
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }

    to {
        transform: translateX(0);
        opacity: 1;
    }
}
  </style>
</head>
<body>
  <header>
    <div class="file-info">
      <span class="file-name" title="${fileName}">${fileName}</span>
      ${fileSize ? `<span class="file-meta">${fileSize}</span>` : ''}
    </div>
    <div class="actions">
      <button class="btn" onclick="copyContent()" id="btnCopy" title="Copiar texto al portapapeles">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 8m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z" /><path d="M16 8v-2a2 2 0 0 0 -2 -2h-8a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2h2" /></svg>
        <span>Copiar</span>
      </button>
      <a class="btn" href="?raw=true" title="Ver texto plano sin formato">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13v-2.343c0-.818 0-1.226-.152-1.594c-.152-.367-.441-.657-1.02-1.235l-4.736-4.736c-.499-.499-.748-.748-1.058-.896a2 2 0 0 0-.197-.082C12.514 2 12.161 2 11.456 2c-3.245 0-4.868 0-5.967.886a4 4 0 0 0-.603.603C4 4.59 4 6.211 4 9.456V13m9-10.5V3c0 2.828 0 4.243.879 5.121C14.757 9 16.172 9 19 9h.5M4 22v-2.5m0 0V16h2.25a1.75 1.75 0 1 1 0 3.5M4 19.5h2.25m0 0L7.5 22m6.5 0l-2.25-6l-2.25 6m3.5-2h-2.5m5.5-4v6l2-2l2 2v-6"/></svg>
        <span>Raw</span>
      </a>
      <a class="btn btn-primary" href="?download=true" title="Descargar archivo">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 11l5 5l5 -5" /><path d="M12 4l0 12" /></svg>
        <span>Descargar</span>
      </a>
    </div>
  </header>
  <main>
    <div class="code-wrapper">
      <pre id="rawContent"><code>${escapedContent}</code></pre>
    </div>
  </main>
  <div id="toast-container"></div>
  <script>
    async function copyContent() {
      const code = document.getElementById("rawContent").textContent;
      await navigator.clipboard.writeText(code);
      showToast('¡Copiado al portapapeles!', 'success');
    }

    // Sistema de Notificaciones Toast
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999;';
        document.body.appendChild(container);
    }
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast ' + type;

    // Iconos dinámicos según el tipo
    let icon = '';
    if (type === 'success') icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
    else if (type === 'error') icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 512 512"><path fill="currentColor" fill-rule="evenodd" d="M256 42.667c117.803 0 213.334 95.53 213.334 213.333S373.803 469.334 256 469.334S42.667 373.803 42.667 256S138.197 42.667 256 42.667m0 42.667c-94.1 0-170.666 76.565-170.666 170.666c0 94.102 76.565 170.667 170.666 170.667c94.102 0 170.667-76.565 170.667-170.667c0-94.101-76.565-170.666-170.667-170.666m48.918 91.584l30.165 30.165L286.166 256l48.917 48.918l-30.165 30.165L256 286.166l-48.917 48.917l-30.165-30.165L225.835 256l-48.917-48.917l30.165-30.165L256 225.835z"/></svg>';
    else if (type === 'info') icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    else if (type === 'warning') icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M12.5 8.752a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0Z"/><circle cx="11.999" cy="16.736" r=".5" fill="currentColor"/><path fill="currentColor" d="M18.642 20.934H5.385a2.5 2.5 0 0 1-2.222-3.644L9.792 4.421a2.5 2.5 0 0 1 4.444 0l6.629 12.869a2.5 2.5 0 0 1-2.223 3.644M12.014 4.065a1.48 1.48 0 0 0-1.334.814L4.052 17.748a1.5 1.5 0 0 0 1.333 2.186h13.257a1.5 1.5 0 0 0 1.334-2.186L13.348 4.879a1.48 1.48 0 0 0-1.334-.814"/></svg>';

    toast.innerHTML = icon + '<span>' + message + '</span>';
    container.appendChild(toast);

    // Auto-eliminar después de 4 segundos
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 40000);

    toast.addEventListener('click', () => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 10);
    });
}
  </script>
</body>
</html>`;