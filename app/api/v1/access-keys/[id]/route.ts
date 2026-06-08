/**
 * Access Key 单个操作 API
 * GET /api/v1/access-keys/:id - 获取 AK 详情
 * PUT /api/v1/access-keys/:id - 更新 AK
 * DELETE /api/v1/access-keys/:id - 删除 AK
 * POST /api/v1/access-keys/:id/disable - 禁用 AK
 * POST /api/v1/access-keys/:id/enable - 启用 AK
 */

import { NextRequest, NextResponse } from 'next/server';
import { accessKeyDb } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

// 认证中间件
async function authenticate(req: NextRequest) {
  const token = extractToken(req.headers.get('authorization'));
  if (!token) {
    return { error: '未提供认证令牌', status: 401 };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return { error: '无效的认证令牌', status: 401 };
  }

  if (!payload.roles.includes('admin')) {
    return { error: '需要管理员权限', status: 403 };
  }

  return { payload };
}

// 路由处理器
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(req);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const key = await accessKeyDb.get(id);

    if (!key) {
      return NextResponse.json({
        success: false,
        message: 'Access Key 不存在',
      }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: key });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '获取 Access Key 失败: ' + error.message,
    }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(req);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const data = await req.json();
    const key = await accessKeyDb.update(id, data);

    if (!key) {
      return NextResponse.json({
        success: false,
        message: 'Access Key 不存在',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: key,
      message: 'Access Key 更新成功',
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '更新 Access Key 失败: ' + error.message,
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(req);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const success = await accessKeyDb.delete(id);

    if (!success) {
      return NextResponse.json({
        success: false,
        message: 'Access Key 不存在',
      }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Access Key 删除成功' });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '删除 Access Key 失败: ' + error.message,
    }, { status: 500 });
  }
}

// 处理 disable 和 enable 操作
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(req);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    let key;
    if (action === 'disable') {
      key = await accessKeyDb.update(id, { is_active: false });
    } else if (action === 'enable') {
      key = await accessKeyDb.update(id, { is_active: true });
    } else {
      return NextResponse.json({
        success: false,
        message: '无效的操作',
      }, { status: 400 });
    }

    if (!key) {
      return NextResponse.json({
        success: false,
        message: 'Access Key 不存在',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: action === 'disable' ? 'Access Key 已禁用' : 'Access Key 已启用',
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '操作失败: ' + error.message,
    }, { status: 500 });
  }
}
