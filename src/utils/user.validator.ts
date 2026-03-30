import z from 'zod';

/**
 * Esquema para la validación del inicio de sesión.
 */
export const loginSchema = z.object({
    body: z.object({
        email: z.string().email('El email es inválido'),
        password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(255, 'La contraseña debe tener menos de 255 caracteres'),
    })
});

/**
 * Esquema para la validación del registro de nuevos usuarios.
 */
export const registerSchema = z.object({
    body: z.object({
        email: z.string().email('El email es inválido'),
        password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(255, 'La contraseña debe tener menos de 255 caracteres'),
    })
});

/**
 * Esquema para la validación del cambio de contraseña.
 */
export const changePasswordSchema = z.object({
    body: z.object({
        oldPassword: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(255, 'La contraseña debe tener menos de 255 caracteres'),
        newPassword: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(255, 'La contraseña debe tener menos de 255 caracteres'),
        confirmPassword: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(255, 'La contraseña debe tener menos de 255 caracteres'),
    })
});