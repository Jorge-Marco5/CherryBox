const userIdBtn = document.getElementById('userId');
const userData = JSON.parse(localStorage.getItem('user'));

if (userIdBtn && userData) {
    userIdBtn.style.cursor = 'pointer';
    userIdBtn.style.transition = 'color 0.2s';
    userIdBtn.title = 'Ver mi información';
    userIdBtn.textContent = `ID: ${userData.id}`;

    userIdBtn.addEventListener('mouseenter', () => userIdBtn.style.color = '#d2042d');
    userIdBtn.addEventListener('mouseleave', () => userIdBtn.style.color = 'white');

    userIdBtn.addEventListener('click', () => {
        // Eliminar modal previo si existe
        const existingModal = document.querySelector('.info-user-modal');
        if (existingModal) existingModal.remove();

        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal active info-user-modal';

        modalOverlay.innerHTML = `
            <div class="modal-content" style="max-width: 400px; border-top: 4px solid var(--primary);">
                <div class="modal-header">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-user-circle"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M12 10m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M6.168 18.849a4 4 0 0 1 3.832 -2.849h4a4 4 0 0 1 3.832 2.849" /></svg>
                    <span style="flex: 1;">Mi Perfil</span>
                    <button class="icon-btn" onclick="this.closest('.modal').remove()" title="Cerrar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>
                <div class="modal-body" style="padding: 10px 0;">
                    <div style="margin-bottom: 15px; display: flex; flex-direction: column; gap: 8px;">
                        <label style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Identificador</label>
                        <div style="background: #252525; padding: 10px; border-radius: 8px; border: 1px solid var(--border); font-family: monospace; color: var(--primary);">${userData.id}</div>
                    </div>
                    <div style="margin-bottom: 15px; display: flex; flex-direction: column; gap: 8px;">
                        <label style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Correo Electrónico</label>
                        <div style="padding: 5px 0; border-bottom: 1px solid var(--border);">${userData.email}</div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <label style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Rol Asignado</label>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="background: ${userData.role === 'SUPERADMIN' ? 'linear-gradient(135deg, #FFD700, #DAA520)' : 'var(--primary)'}; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; letter-spacing: 0.5px;">
                                ${userData.role}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="modal-actions" style="margin-top: 25px;">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()" style="width: 100%; max-width: none;">Cerrar</button>
                </div>
            </div>
        `;

        // Cerrar al hacer click fuera
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) modalOverlay.remove();
        });

        document.body.appendChild(modalOverlay);
    });
}