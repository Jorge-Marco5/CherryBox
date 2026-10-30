const userIdBtn = document.getElementById('userId');

if (userIdBtn && user) {
    userIdBtn.style.cursor = 'pointer';
    userIdBtn.style.transition = 'color 0.2s';
    userIdBtn.title = 'Ver mi información';
    userIdBtn.textContent = `ID: ${user.id}`;

    userIdBtn.addEventListener('mouseenter', () => userIdBtn.style.color = '#d2042d');
    userIdBtn.addEventListener('mouseleave', () => userIdBtn.style.color = 'white');

    userIdBtn.addEventListener('click', async () => {

        const userModalBody = `
            <div style="margin-bottom: 15px; display: flex; flex-direction: column; gap: 8px;">
                <label style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Identificador</label>
                <div onclick="copyToClipboard('${user.id}')" style="background: #252525; padding: 10px; border-radius: 8px; border: 1px solid var(--border); font-family: monospace; color: var(--primary); cursor: pointer;">${user.id}</div>
            </div>
            <div style="margin-bottom: 15px; display: flex; flex-direction: column; gap: 8px;">
                <label style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Correo Electrónico</label>
                <div onclick="copyToClipboard('${user.email}')" style="padding: 5px 0; border-bottom: 1px solid var(--border); cursor: pointer;">${user.email}</div>
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

        await modalHandler.callModalMessage('Mi Perfil', 'Información general del perfil', {
            bodyContent: userModalBody,
            size: "md"               // Tamaño compacto para diálogos
        })
    });
}