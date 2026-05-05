// Manejo de formulario de Login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await axios.post('/api/auth/login', { email, password });
            //guardar datos basicos de usuario en localStorage
            localStorage.setItem('user', JSON.stringify(response.data.user));
            window.location.href = '/';
        } catch (error) {
            console.error(error);
            const errorMsg = error.response?.data?.error || 'Error al iniciar sesión. Por favor, verifica tus credenciales.';
            showToast(errorMsg, 'error');
        }
    });
}

// Manejo de formulario de Registro
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const passwordConfirm = document.getElementById('passwordConfirm').value;

        if (password !== passwordConfirm) {
            showToast('Las contraseñas no coinciden', 'error');
            return;
        }

        try {
            const res = await axios.post('/api/auth/register', { email, password }, { silent: true });
            showToast(res.data.message || 'Usuario registrado exitosamente', 'success');
            registerForm.reset();
        } catch (error) {
            console.error(error);
            const errorMsg = error.response?.data?.error || 'Error al registrar usuario. Inténtalo de nuevo más tarde.';
            showToast(errorMsg, 'error');
        }
    });
}

/**
 * Muestra u oculta la contraseña
 * @param {string} inputId - ID del input de contraseña
 * @param {string} btnId - ID del botón que muestra u oculta la contraseña
 */
const pass1 = document.getElementById('password');
const pass2 = document.getElementById('passwordConfirm');
const message = document.getElementById('message');
const btn = document.getElementById('toggleAll');

// 1. Lógica para ver/ocultar
function toggleAllPasswords() {
    const type = pass1.type === 'password' ? 'text' : 'password';
    pass1.type = type;
    pass1.placeholder = type === 'password' ? '••••••••' : 'Contraseña';
    if (pass2) {
        pass2.type = type;
        pass2.placeholder = type === 'password' ? '••••••••' : 'Contraseña';
    }
    btn.innerHTML = type === 'password' ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-eye"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6" /></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-eye-off"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M10.585 10.587a2 2 0 0 0 2.829 2.828" /><path d="M16.681 16.673a8.717 8.717 0 0 1 -4.681 1.327c-3.6 0 -6.6 -2 -9 -6c1.272 -2.12 2.712 -3.678 4.32 -4.674m2.86 -1.146a9.055 9.055 0 0 1 1.82 -.18c3.6 0 6.6 2 9 6c-.666 1.11 -1.379 2.067 -2.138 2.87" /><path d="M3 3l18 18" /></svg>';
}

function validatePass() {
    // Solo validar si ambos campos tienen algo escrito
    if (pass1.value.length > 0 && pass2.value.length > 0) {
        if (pass1.value !== pass2.value) {
            message.textContent = 'Las contraseñas no coinciden';
            message.style.display = 'block';
            pass2.classList.add('error-border');
            pass1.classList.add('error-border');
        } else {
            message.textContent = 'Las contraseñas coinciden';
            message.style.display = 'block';
            pass1.classList.remove('error-border');
            pass2.classList.remove('error-border');
        }
    } else {
        message.style.display = 'none';
    }
}