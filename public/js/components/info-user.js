const userIdBtn = document.getElementById('userId');

if (userIdBtn && user) {
    userIdBtn.style.cursor = 'pointer';
    userIdBtn.style.transition = 'color 0.2s';
    userIdBtn.title = 'Ver mi información';
    userIdBtn.textContent = `ID: ${user.id}`;

    userIdBtn.addEventListener('mouseenter', () => userIdBtn.style.color = '#d2042d');
    userIdBtn.addEventListener('mouseleave', () => userIdBtn.style.color = 'white');

    userIdBtn.addEventListener('click', () => {
        currentModalActive = 'info-user-modal';
        document.getElementById(currentModalActive)?.classList.add("active");

        const modalOverlay = document.querySelector('#info-user-modal');

        const userModalBody = modalOverlay.querySelector('.modal-body')
        userModalBody.innerHTML = `
            <div style="margin-bottom: 15px; display: flex; flex-direction: column; gap: 8px;">
                <label style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Identificador</label>
                <div style="background: #252525; padding: 10px; border-radius: 8px; border: 1px solid var(--border); font-family: monospace; color: var(--primary);">${user.id}</div>
            </div>
            <div style="margin-bottom: 15px; display: flex; flex-direction: column; gap: 8px;">
                <label style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Correo Electrónico</label>
                <div style="padding: 5px 0; border-bottom: 1px solid var(--border);">${user.email}</div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <label style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Rol Asignado</label>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="background: ${user.role === 'SUPERADMIN' ? 'linear-gradient(135deg, #FFD700, #DAA520)' : 'var(--primary)'}; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; letter-spacing: 0.5px;">
                        ${user.role}
                    </span>
                </div>
            </div>
        `;
    });
}