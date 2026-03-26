import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET as string

export const signToken = (payload: object) => {
    const options: jwt.SignOptions = {
        expiresIn: (process.env.JWT_EXPIRES_IN as any) || "7d"
    }
    return jwt.sign(payload, JWT_SECRET, options)
}

export const verifyToken = (token: string) => {
    return jwt.verify(token, JWT_SECRET)
}