/**
 * 日志相关 API
 * GET /api/v1/logs/stats - 获取日志统计
 * GET /api/v1/logs/login - 获取当前用户登录日志
 * GET /api/v1/logs/login/all - 获取所有登录日志（管理员）
 */

import { NextRequest, NextResponse } from 'next/server';
import { loginLogDb, logDb } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

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

// GET - 处理所有日志相关请求
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];

    if (lastPart === 'stats') {
      // 获取日志统计
      const auth = await authenticate(req);
      if (auth.error) {
        return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
      }

      const start_time = req.nextUrl.searchParams.get('start_time') || '';
      const end_time = req.nextUrl.searchParams.get('end_time') || '';

      const stats = await logDb.getStats(start_time, end_time);

      return NextResponse.json({ success: true, data: stats });
    }

    if (lastPart === 'login') {
      // 获取当前用户登录日志
      const auth = await authenticate(req);
      if (auth.error) {
        return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
      }

      const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
      const logs = await loginLogDb.getMyLogs(limit);

      // 过滤当前用户的日志
      const userLogs = logs.filter(log => log.username === (auth.payload?.username || ''));

      return NextResponse.json({
        success: true,
        data: {
          logs: userLogs,
          total: userLogs.length,
        },
      });
    }

    if (lastPart === 'all') {
      // 获取所有登录日志（管理员）
      const auth = await authenticate(req, true);
      if (auth.error) {
        return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
      }

      const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
      const page_size = parseInt(req.nextUrl.searchParams.get('page_size') || '20');
      const username = req.nextUrl.searchParams.get('username') || undefined;

      const result = await loginLogDb.getAllLogs(page, page_size);

      // 如果指定了用户名，过滤结果
      let filteredLogs = result.logs;
      if (username) {
        filteredLogs = result.logs.filter(log => log.username === username);
      }

      return NextResponse.json({
        success: true,
        data: {
          logs: filteredLogs,
          total: username ? filteredLogs.length : result.total,
          page,
          page_size,
        },
      });
    }

    return NextResponse.json({ success: false, message: '无效的请求' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '获取日志失败: ' + error.message,
    }, { status: 500 });
  }
}
