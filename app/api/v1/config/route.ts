/**
 * 系统配置 API
 * GET /api/v1/config - 获取配置
 * POST /api/v1/config - 更新配置
 * POST /api/v1/config/reload - 重载配置
 * POST /api/v1/config/restart - 重启服务
 */

import { NextRequest, NextResponse } from 'next/server';
import { configDb } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { initializeDetector } from '@/lib/detector';
import { checkAIConfig } from '@/lib/ai-service';

// 认证中间件
async function authenticate(req: NextRequest, requireAdmin: boolean = false) {
  const token = extractToken(req.headers.get('authorization'));
  if (!token) {
    return { error: '未提供认证令牌', status: 401 };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return { error: '无效的认证令牌', status: 401 };
  }

  if (requireAdmin && !payload.roles.includes('admin')) {
    return { error: '需要管理员权限', status: 403 };
  }

  return { payload };
}

// GET - 获取配置
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const config = await configDb.get();

    // 检查 AI 配置状态
    const aiStatus = await checkAIConfig();

    return NextResponse.json({
      success: true,
      data: {
        ...config,
        ai: aiStatus,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '获取配置失败: ' + error.message,
    }, { status: 500 });
  }
}

// POST - 更新配置
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req, true);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];

    if (lastPart === 'reload') {
      await initializeDetector();
      return NextResponse.json({ success: true, message: '配置重载成功' });
    }

    if (lastPart === 'restart') {
      return NextResponse.json({
        success: true,
        message: '无服务器环境无需重启，配置已生效',
      });
    }

    // 默认是更新配置
    const data = await req.json();
    const config = await configDb.update(data);
    return NextResponse.json({ success: true, data: config, message: '配置更新成功' });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '操作失败: ' + error.message,
    }, { status: 500 });
  }
}
