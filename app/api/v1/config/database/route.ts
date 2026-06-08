/**
 * 数据库配置管理 API
 * GET /api/v1/config/database - 获取数据库配置
 * POST /api/v1/config/database - 更新数据库配置
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

// GET - 获取数据库配置
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const config = await prisma.systemConfig.findUnique({
      where: { key: 'database_config' },
    });

    if (!config) {
      return NextResponse.json({
        success: true,
        data: {
          type: 'postgresql',
          url: '',
          poolSize: 10,
          connectionTimeout: 30,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: JSON.parse(config.value),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '获取数据库配置失败: ' + error.message,
    }, { status: 500 });
  }
}

// POST - 更新数据库配置（只读，通过环境变量配置）
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    // 数据库配置主要通过环境变量设置
    return NextResponse.json({
      success: false,
      message: '数据库配置请通过 Vercel 环境变量设置 (DATABASE_URL)',
    }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '操作失败: ' + error.message,
    }, { status: 500 });
  }
}
