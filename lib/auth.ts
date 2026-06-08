/**
 * JWT 认证工具
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

const JWT_SECRET = process.env.JWT_SECRET || 'daf-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface JWTPayload {
  userId: string;
  username: string;
  roles: string[];
}

/**
 * 生成 JWT Token
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * 验证 JWT Token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * 哈希密码
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * 验证密码
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * 生成 Access Key
 */
export function generateAccessKey(): string {
  return `daf_${nanoid(32)}`;
}

/**
 * 生成 Secret Key
 */
export function generateSecretKey(): string {
  return nanoid(48);
}

/**
 * 从请求头中提取 Token
 */
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}

/**
 * 中间件：验证用户身份
 */
export function authenticate(handler: any) {
  return async (req: any, res: any) => {
    const token = extractToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌',
      });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({
        success: false,
        message: '无效的认证令牌',
      });
    }

    req.user = payload;
    return handler(req, res);
  };
}

/**
 * 中间件：验证管理员权限
 */
export function requireAdmin(handler: any) {
  return async (req: any, res: any) => {
    if (!req.user?.roles?.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限',
      });
    }
    return handler(req, res);
  };
}

/**
 * 中间件：验证词库管理员权限
 */
export function requireWordManager(handler: any) {
  return async (req: any, res: any) => {
    if (!req.user?.roles?.includes('admin') && !req.user?.roles?.includes('word_manager')) {
      return res.status(403).json({
        success: false,
        message: '需要管理员或词库管理员权限',
      });
    }
    return handler(req, res);
  };
}
