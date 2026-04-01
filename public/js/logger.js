const user = JSON.parse(localStorage.getItem('user'));
const currentPathName = window.location.pathname;

// Guardas de vista para despliegues estáticos (Nginx)
const adminPages = ['/users', '/logs', '/settings', '/users.html', '/logs.html', '/settings.html'];
const isAdminPage = adminPages.some(page => currentPathName.includes(page));

if (!user && isAdminPage && currentPathName !== '/login') {
    window.location.href = '/login';
}

if (user) {

    // Bloqueo visual preventivo si no es ADMIN en página de administración
    if (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN' && isAdminPage) {
        document.addEventListener("DOMContentLoaded", () => {
            document.body.innerHTML = `
            <div style="height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0f0f0f; color: #fff; font-family: sans-serif;">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ff4d4d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M3 3l18 18"/></svg>
                <h1 style="margin-top: 20px;">Acceso Denegado</h1>
                <p style="color: #888;">No tienes permisos para acceder a esta sección.</p>
                <a href="/" style="margin-top: 20px; padding: 10px 20px; background: #d2042d; color: #fff; text-decoration: none; border-radius: 5px;">Volver al Inicio</a>
            </div>`;
        });
    }

    const adminActions = document.getElementById('admin-actions');
    if (adminActions && user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
        adminActions.style.display = 'none';
    }
} else if (isAdminPage) {
    window.location.href = '/login';
}


// Interceptor global para errores
axios.interceptors.response.use(
    response => {
        // Mostrar toast de éxito si la respuesta tiene un mensaje y no es un GET
        if (response.data && response.data.message && response.config.method !== 'get') {
            showToast(response.data.message, 'success');
        }
        return response;
    },
    error => {
        const status = error.response ? error.response.status : null;
        const message = error.response?.data?.error || "Error de conexión con el servidor";

        if (status === 401 && window.location.pathname !== '/login') {
            window.location.href = '/login';
        } else {
            showToast(message, 'error');
        }
        return Promise.reject(error);
    }
);