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