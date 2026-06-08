/**
 * AI 更新历史 API
 * GET /api/v1/ai/history - 获取 AI 更新历史
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // 验证权限
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

    if (!payload.roles.includes('admin') && !payload.roles.includes('word_manager')) {
      return NextResponse.json({
        success: false,
        message: '需要管理员或词库管理员权限',
      }, { status: 403 });
    }

    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
    const page_size = parseInt(req.nextUrl.searchParams.get('page_size') || '20');

    const [history, total] = await Promise.all([
      prisma.wordUpdateHistory.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * page_size,
        take: page_size,
      }),
      prisma.wordUpdateHistory.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        history,
        total,
        page,
        page_size,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '获取更新历史失败: ' + error.message,
    }, { status: 500 });
  }
}
