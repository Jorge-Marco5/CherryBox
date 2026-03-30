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
            const response = await axios.get("/api/users");
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
                        <button class="btn btn-secondary" title="Editar" onclick="openEditModal('${user.id}', '${user.email}', '${user.role}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="btn ${user.is_blocked ? 'btn-secondary' : 'btn-primary'}" title="${user.is_blocked ? 'Desbloquear' : 'Bloquear'}" onclick="toggleBlock('${user.id}')">
                            ${user.is_blocked
                        ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-lock-access-off"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M4 8v-2c0 -.554 .225 -1.055 .588 -1.417" /><path d="M4 16v2a2 2 0 0 0 2 2h2" /><path d="M16 4h2a2 2 0 0 1 2 2v2" /><path d="M16 20h2c.55 0 1.05 -.222 1.41 -.582" /><path d="M15 11a1 1 0 0 1 1 1m-.29 3.704a1 1 0 0 1 -.71 .296h-6a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1h2" /><path d="M10 11v-1m1.182 -2.826a2 2 0 0 1 2.818 1.826v1" /><path d="M3 3l18 18" /></svg>'
                        : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-lock-access"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M4 8v-2a2 2 0 0 1 2 -2h2" /><path d="M4 16v2a2 2 0 0 0 2 2h2" /><path d="M16 4h2a2 2 0 0 1 2 2v2" /><path d="M16 20h2a2 2 0 0 0 2 -2v-2" /><path d="M8 12a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1v3a1 1 0 0 1 -1 1h-6a1 1 0 0 1 -1 -1l0 -3" /><path d="M10 11v-2a2 2 0 1 1 4 0v2" /></svg>'}
                        </button>
                        <button class="btn btn-danger" title="Eliminar" onclick="confirmDelete('${user.id}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                    </div>
                </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error(error.response.data.error || "Error al obtener usuarios:", error);
        }
    }

    // Funciones Globales para los onclick
    window.openEditModal = (id, email, role) => {
        document.getElementById('editUserId').value = id;
        document.getElementById('editEmail').value = email;
        document.getElementById('editRole').value = role;
        editUserModal.classList.add('active');
    };

    window.closeEditModal = () => {
        editUserModal.classList.remove('active');
    };

    window.toggleBlock = async (id) => {
        try {
            await axios.patch(`/api/users/${id}/block`);
            updateUsers();
        } catch (error) {
            alert(error.response.data.error || "Error al cambiar estado de bloqueo");
        }
    };

    window.toggleRole = async (id, currentRole) => {
        const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
        try {
            await axios.patch(`/api/users/${id}/role`, { role: newRole });
            updateUsers();
        } catch (error) {
            alert(error.response.data.error || "Error al cambiar el rol");
        }
    };

    window.confirmDelete = async (id) => {
        if (confirm("¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.")) {
            try {
                await axios.delete(`/api/users/${id}`);
                updateUsers();
            } catch (error) {
                alert(error.response.data.error || "Error al eliminar usuario");
            }
        }
    };

    // Manejo de Formulario de Edición
    editUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editUserId').value;
        const email = document.getElementById('editEmail').value;
        const role = document.getElementById('editRole').value;

        try {
            if (email) {
                await axios.put(`/api/users/${id}`, { email });
            }
            if (role) {
                await axios.patch(`/api/users/${id}/role`, { role });
            }
            closeEditModal();
            updateUsers();
        } catch (error) {
            alert(error.response.data.error || "Error al guardar cambios");
        }
    });

    // Cerrar modal al hacer click fuera
    window.addEventListener('click', (e) => {
        if (e.target === editUserModal) {
            closeEditModal();
        }
    });

    updateUsers();
});