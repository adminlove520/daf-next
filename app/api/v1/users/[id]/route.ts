/**
 * 单个用户操作 API
 * PUT /api/v1/users/:id - 更新用户
 * DELETE /api/v1/users/:id - 删除用户
 */

import { NextRequest, NextResponse } from 'next/server';
import { userDb } from '@/lib/db';
import { extractToken, verifyToken, hashPassword } from '@/lib/auth';

// PUT - 更新用户
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    const { username, password, roles, is_active } = await req.json();

    const updateData: any = {};
    if (username !== undefined) updateData.username = username;
    if (password) updateData.password_hash = await hashPassword(password);
    if (roles !== undefined) updateData.roles = Array.isArray(roles) ? roles : [roles];
    if (is_active !== undefined) updateData.is_active = is_active;

    const user = await userDb.update(id, updateData);

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
      message: '用户更新成功',
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '更新用户失败: ' + error.message,
    }, { status: 500 });
  }
}

// DELETE - 删除用户
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    const success = await userDb.delete(id);

    if (!success) {
      return NextResponse.json({
        success: false,
        message: '用户不存在',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: '用户删除成功',
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '删除用户失败: ' + error.message,
    }, { status: 500 });
  }
}
