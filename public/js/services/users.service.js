const API_URL = "/api";
document.addEventListener("DOMContentLoaded", () => {
    const usersTable = document.getElementById("users");
    const editUserModal = document.getElementById("editUserModal");
    const editUserForm = document.getElementById("editUserForm");

    // Estructura inicial de la tabla
    usersTable.innerHTML = `
    <thead>
        <tr>
            <th>Usuario</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Acciones</th>
        </tr>
    </thead>
    <tbody></tbody>
    `;

    async function updateUsers() {
        try {
            const response = await axios.get(`${API_URL}/users`);
            const tbody = usersTable.querySelector("tbody");
            tbody.innerHTML = "";

            response.data.forEach((user) => {
                const tr = document.createElement("tr");

                // Badge de Rol
                const roleBadge = user.role === 'ADMIN'
                    ? `<span class="badge badge-admin">ADMIN</span>`
                    : `<span class="badge badge-user">USER</span>`;

                // Badge de Estado
                const statusBadge = user.is_blocked
                    ? `<span class="badge badge-danger">Bloqueado</span>`
                    : `<span class="badge badge-success">Activo</span>`;

                tr.innerHTML = `
                <td>
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-weight: 500;">${user.email}</span>
                        <span style="font-size: 11px; color: #888; font-family: monospace;">${user.id}</span>
                    </div>
                </td>
                <td>${roleBadge}</td>
                <td>${statusBadge}</td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button class="square secondary" title="Editar" onclick="openEditModal('${user.id}', '${user.email}', '${user.role}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="square ${user.is_blocked ? 'secondary' : 'primary'}" title="${user.is_blocked ? 'Desbloquear' : 'Bloquear'}" onclick="toggleBlock('${user.is_blocked ? 'Desbloquear' : 'Bloquear'}','${user.id}')">
                            ${user.is_blocked
                        ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-lock-open"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2l0 -6" /><path d="M11 16a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M8 11v-5a4 4 0 0 1 8 0" /></svg>'
                        : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-lock"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6" /><path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" /><path d="M8 11v-4a4 4 0 1 1 8 0v4" /></svg>'}
                        </button>
                        <button class="square danger" title="Eliminar" onclick="confirmDelete('${user.id}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                    </div>
                </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            if (error.response && error.response.status === 403) {
                usersTable.parentElement.innerHTML = `
                <div style="text-align: center; padding: 50px; color: #ff4d4d; background: var(--card-bg); border-radius: 15px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M3 3l18 18"/></svg>
                    <h2 style="margin-top: 20px; color: #fff;">Acceso Denegado</h2>
                    <p style="color: #888;">No tienes permisos para gestionar usuarios.</p>
                    <a href="/" class="btn btn-primary" style="display: inline-block; margin-top: 15px;">Volver al Inicio</a>
                </div>
                `;
            } else if (error.response && error.response.status === 401) {
                window.location.href = '/login';
            } else {
                showToast(error.response?.data?.error || "Error al obtener usuarios", 'error');
            }
        }
    }

    // Funciones Globales para los onclick
    window.openEditModal = async (id, email, role) => {
        const modalData = await modalHandler.callModalForm({
            title: "Editar usuario",
            description: "Edita la informacion de un usuario.",
            formContent: [
                {
                    name: "email",
                    label: "Nuevo email",
                    placeholder: "Ingresa el nuevo email.",
                    type: "text",
                    value: email,
                    required: true
                },
                {
                    name: "role",
                    label: "Nuevo rol",
                    placeholder: "Selecciona un nuevo rol",
                    type: "select",
                    options: [{ label: 'ADMIN', value: 'ADMIN' }, { label: 'USER', value: 'USER' }],
                    value: role,
                    required: true
                },
            ],
            options: {
                confirmText: "Guardar",
                cancelText: "Cancelar",
                type: "primary",
            }
        });
        if (!modalData) {
            return;
        }
        updateInfoUser(id, modalData.email, modalData.role)
        updateUsers();
    };

    window.toggleBlock = async (lockStatus, id) => {
        if (await modalHandler.callModalConfirm(`${lockStatus} usuario`, `¿Estás seguro de que deseas ${lockStatus.toLowerCase()} al usuario?`)) {
            try {
                await axios.patch(`${API_URL}/users/${id}/block`);
                updateUsers();
            } catch (error) {
                showToast(error.response.data.error || "Error al cambiar estado de bloqueo", 'error');
            }
        }
    };

    window.toggleRole = async (id, currentRole) => {
        const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
        try {
            await axios.patch(`${API_URL}/users/${id}/role`, { role: newRole });
            updateUsers();
        } catch (error) {
            showToast(error.response.data.error || "Error al cambiar el rol", 'error');
        }
    };

    window.confirmDelete = async (id) => {
        if (await modalHandler.callModalConfirm('Eliminar usuario', '¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.')) {
            try {
                await axios.delete(`${API_URL}/users/${id}`);
                showToast("Usuario eliminado con exito", 'success');
                updateUsers();
            } catch (error) {
                showToast(error.response.data.error || "Error al eliminar usuario", 'error');
            }
        }
    };

    async function updateInfoUser(id, email, role) {
        try {
            if (email) {
                await axios.put(`${API_URL}/users/${id}`, { email });
            }
            if (role) {
                await axios.patch(`${API_URL}/users/${id}/role`, { role });
            }
            showToast("Usuario actualizado correctamente", 'success');
        } catch (error) {
            showToast(error.response.data.error || "Error al guardar cambios", 'error');
        }
    }

    updateUsers();
});