/**
 * 用户管理 API
 * GET /api/v1/users - 获取用户列表
 * POST /api/v1/users - 创建用户
 */

import { NextRequest, NextResponse } from 'next/server';
import { userDb } from '@/lib/db';
import { extractToken, verifyToken, hashPassword } from '@/lib/auth';
import { nanoid } from 'nanoid';

// GET - 获取用户列表
export async function GET(req: NextRequest) {
  try {
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

    if (!payload.roles.includes('admin')) {
      return NextResponse.json({
        success: false,
        message: '需要管理员权限',
      }, { status: 403 });
    }

    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
    const page_size = parseInt(req.nextUrl.searchParams.get('page_size') || '10');

    const result = await userDb.list(page, page_size);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '获取用户列表失败: ' + error.message,
    }, { status: 500 });
  }
}

// POST - 创建用户
export async function POST(req: NextRequest) {
  try {
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

    if (!payload.roles.includes('admin')) {
      return NextResponse.json({
        success: false,
        message: '需要管理员权限',
      }, { status: 403 });
    }

    const { username, password, roles = ['user'], is_active = true } = await req.json();

    if (!username || !password) {
      return NextResponse.json({
        success: false,
        message: '用户名和密码不能为空',
      }, { status: 400 });
    }

    // 检查用户是否已存在
    const existing = await userDb.findByUsername(username);
    if (existing) {
      return NextResponse.json({
        success: false,
        message: '用户名已存在',
      }, { status: 400 });
    }

    // 创建用户
    const user = {
      id: nanoid(),
      username,
      password_hash: await hashPassword(password),
      roles: Array.isArray(roles) ? roles : [roles],
      is_active,
      created_at: new Date().toISOString(),
    };

    await userDb.create(user);

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        roles: user.roles,
        is_active: user.is_active,
      },
      message: '用户创建成功',
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '创建用户失败: ' + error.message,
    }, { status: 500 });
  }
}
