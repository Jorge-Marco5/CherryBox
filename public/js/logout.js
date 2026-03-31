async function logout() {
    try {
        await axios.post('/api/auth/logout');
        localStorage.removeItem('user');
        window.location.href = '/login';
    } catch (error) {
        showToast(error.response?.data?.error || 'Error al cerrar sesión', 'error');
    }
}