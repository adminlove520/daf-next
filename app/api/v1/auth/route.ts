/**
 * 认证相关 API
 * POST /api/v1/auth/login - 登录
 * GET /api/v1/auth/me - 获取当前用户信息
 * POST /api/v1/auth/change-password - 修改密码
 */

import { NextRequest, NextResponse } from 'next/server';
import { userDb, loginLogDb } from '@/lib/db';
import { verifyPassword, generateToken, extractToken, verifyToken, hashPassword } from '@/lib/auth';

// POST - 登录或修改密码
export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];

    if (lastPart === 'login') {
      const { username, password } = await req.json();

      if (!username || !password) {
        return NextResponse.json({
          success: false,
          message: '用户名和密码不能为空',
        }, { status: 400 });
      }

      // 查找用户
      const user = await userDb.findByUsername(username);
      if (!user) {
        // 记录登录失败
        await loginLogDb.add(username, false, req.headers.get('x-forwarded-for') || 'unknown');

        return NextResponse.json({
          success: false,
          message: '用户名或密码错误',
        }, { status: 401 });
      }

      // 验证密码
      const isPasswordValid = await verifyPassword(password, user.password_hash);

      if (!isPasswordValid) {
        // 记录登录失败
        await loginLogDb.add(username, false, req.headers.get('x-forwarded-for') || 'unknown');

        return NextResponse.json({
          success: false,
          message: '用户名或密码错误',
        }, { status: 401 });
      }

      if (!user.is_active) {
        return NextResponse.json({
          success: false,
          message: '用户已被禁用',
        }, { status: 403 });
      }

      // 记录登录成功
      await loginLogDb.add(username, true, req.headers.get('x-forwarded-for') || 'unknown');

      // 生成 Token
      const token = generateToken({
        userId: user.id,
        username: user.username,
        roles: user.roles,
      });

      return NextResponse.json({
        success: true,
        message: '登录成功',
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            roles: user.roles,
          },
        },
      });
    }

    if (lastPart === 'change-password') {
      const token = extractToken(req.headers.get('authorization'));
      if (!token) {
        return NextResponse.json({
          success: false,
          message: '未提供认证令牌',
        }, { status: 401 });
      }

      const payload = verifyToken(token);
      if (!payload) {
        return NextResponse.json({
          success: false,
          message: '无效的认证令牌',
        }, { status: 401 });
      }

      const { old_password, new_password } = await req.json();

      if (!old_password || !new_password) {
        return NextResponse.json({
          success: false,
          message: '旧密码和新密码不能为空',
        }, { status: 400 });
      }

      const user = await userDb.findByUsername(payload.username);
      if (!user) {
        return NextResponse.json({
          success: false,
          message: '用户不存在',
        }, { status: 404 });
      }

      // 验证旧密码
      const isOldPasswordValid = await verifyPassword(old_password, user.password_hash);
      if (!isOldPasswordValid) {
        return NextResponse.json({
          success: false,
          message: '旧密码错误',
        }, { status: 400 });
      }

      // 更新密码
      user.password_hash = await hashPassword(new_password);
      await userDb.update(user.id, { password_hash: user.password_hash });

      return NextResponse.json({
        success: true,
        message: '密码修改成功',
      });
    }

    return NextResponse.json({ success: false, message: '无效的请求' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '操作失败: ' + error.message,
    }, { status: 500 });
  }
}

// GET - 获取当前用户信息
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];

    if (lastPart === 'me') {
      const token = extractToken(req.headers.get('authorization'));
      if (!token) {
        return NextResponse.json({
          success: false,
          message: '未提供认证令牌',
        }, { status: 401 });
      }

      const payload = verifyToken(token);
      if (!payload) {
        return NextResponse.json({
          success: false,
          message: '无效的认证令牌',
        }, { status: 401 });
      }

      const user = await userDb.findByUsername(payload.username);
      if (!user) {
        return NextResponse.json({
          success: false,
          message: '用户不存在',
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          roles: user.roles,
          is_active: user.is_active,
        },
      });
    }

    return NextResponse.json({ success: false, message: '无效的请求' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '获取用户信息失败: ' + error.message,
    }, { status: 500 });
  }
}
