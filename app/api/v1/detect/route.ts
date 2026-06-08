/**
 * 文本检测和过滤 API
 * POST /api/v1/detect - 检测指定分类的敏感词
 * POST /api/v1/detect/all - 全量检测
 * POST /api/v1/detect/filter - 过滤文本中的敏感词
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDetector } from '@/lib/detector';
import { logDb } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

// 认证中间件（可选）
async function authenticate(req: NextRequest) {
  const token = extractToken(req.headers.get('authorization'));
  if (!token) return null;

  const payload = verifyToken(token);
  return payload || null;
}

// GET - 健康检查
export async function GET() {
  return NextResponse.json({
    success: true,
    message: '服务正常运行',
    timestamp: new Date().toISOString(),
  });
}

// POST - 检测指定分类的敏感词或全量检测
export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    const isAll = lastPart === 'all';
    const isFilter = lastPart === 'filter';

    const { text, category, with_pos = true, use_ai = false } = await req.json();

    if (!text) {
      return NextResponse.json({
        success: false,
        message: '文本不能为空',
      }, { status: 400 });
    }

    // 确保检测器已初始化
    const { initializeDetector } = await import('@/lib/detector');
    await initializeDetector();

    // 获取检测器
    const detector = getDetector();

    if (isFilter) {
      // 过滤文本
      const result = detector.filter(text, category);
      return NextResponse.json({
        success: true,
        data: {
          ...result,
          original_text: text,
        },
      });
    }

    // 检测敏感词
    const matches = detector.detect(text, isAll ? undefined : category);

    // 构建响应
    const words = with_pos ? matches : matches.map(m => ({
      word: m.word,
      category: m.category,
      reason: m.reason,
    }));

    const result = {
      has_sensitive: matches.length > 0,
      words,
      original_text: text,
    };

    // 记录日志
    const payload = await authenticate(req);
    if (payload) {
      await logDb.add({
        text: text.substring(0, 100),
        has_sensitive: result.has_sensitive,
        category: isAll ? 'all' : (category || 'all'),
        user: payload.username,
        match_count: matches.length,
      });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '操作失败: ' + error.message,
    }, { status: 500 });
  }
}
