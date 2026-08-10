import { Request, Response, NextFunction } from 'express';

export const validateIdempotencyKey = (req: Request, res: Response, next: NextFunction) => {
    const idempotencyKey = req.headers['x-idempotency-key'] as string;

    if (!idempotencyKey || Array.isArray(idempotencyKey)) {
        return res.status(400).json({ 
            status: 'ERROR', 
            message: 'Header "x-idempotency-key" wajib diisi!' 
        })
    }
    next();
}