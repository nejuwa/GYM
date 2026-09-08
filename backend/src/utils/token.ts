import jwt, { SignOptions } from 'jsonwebtoken';

export interface TokenPayload {
  id: string;
  email: string;
  username: string;
  role: string;
  fullName: string;
}

const accessSecret = () =>
  process.env.JWT_SECRET || 'gymmis_ultra_secure_jwt_secret_key_2026_fitness_hub';

const refreshSecret = () =>
  process.env.JWT_REFRESH_SECRET || `${accessSecret()}_refresh`;

export const signAccessToken = (payload: TokenPayload) =>
  jwt.sign(payload, accessSecret(), {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
  });

export const signRefreshToken = (userId: string) =>
  jwt.sign({ id: userId, type: 'refresh' }, refreshSecret(), {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as SignOptions['expiresIn'],
  });

export const verifyRefreshToken = (token: string): { id: string } => {
  const decoded = jwt.verify(token, refreshSecret()) as { id: string; type?: string };
  if (decoded.type !== 'refresh') {
    throw new Error('Provided token is not a refresh token');
  }
  return { id: decoded.id };
};
