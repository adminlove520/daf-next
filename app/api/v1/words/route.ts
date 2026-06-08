/**
 * 词库管理 API
 * GET /api/v1/words - 获取词库列表
 * POST /api/v1/words - 添加词汇
 * DELETE /api/v1/words - 删除词汇
 * DELETE /api/v1/words/clear - 清空词库
 */

import { NextRequest, NextResponse } from 'next/server';
import { wordDb } from '@/lib/db';
import { getDetector } from '@/lib/detector';
import { extractToken, verifyToken } from '@/lib/auth';

// 认证中间件
async function authenticate(req: NextRequest, requireWordManager: boolean = false) {
  const token = extractToken(req.headers.get('authorization'));
  if (!token) {
    return { error: '未提供认证令牌', status: 401 };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return { error: '无效的认证令牌', status: 401 };
  }

  if (requireWordManager) {
    if (!payload.roles.includes('admin') && !payload.roles.includes('word_manager')) {
      return { error: '需要管理员或词库管理员权限', status: 403 };
    }
  }

  return { payload };
}

// GET - 获取词库列表
export async function GET(req: NextRequest) {
  try {
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
    const page_size = parseInt(req.nextUrl.searchParams.get('page_size') || '50');
    const category = req.nextUrl.searchParams.get('category') || undefined;
    const keyword = req.nextUrl.searchParams.get('keyword') || undefined;

    const result = await wordDb.list({ page, page_size, category, keyword });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '获取词库失败: ' + error.message,
    }, { status: 500 });
  }
}

// POST - 添加词汇
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req, true);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const { words, reasons } = await req.json();

    if (!words || typeof words !== 'object') {
      return NextResponse.json({
        success: false,
        message: '词汇数据格式错误',
      }, { status: 400 });
    }

    // 添加到数据库
    const result = await wordDb.add(words, reasons);

    // 更新检测器
    const detector = getDetector();
    Object.entries(words).forEach(([word, category]) => {
      detector.addWord(word, category as string, reasons?.[word]);
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `成功添加 ${result.added_count} 个敏感词`,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '添加词汇失败: ' + error.message,
    }, { status: 500 });
  }
}

// DELETE - 删除词汇或清空词库
export async function DELETE(req: NextRequest) {
  try {
    const auth = await authenticate(req, true);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const url = new URL(req.url);
    const isClear = url.pathname.endsWith('/clear');

    if (isClear) {
      // 清空词库
      const count = await wordDb.clear();

      // 重新初始化检测器
      const { initializeDetector } = await import('@/lib/detector');
      await initializeDetector();

      return NextResponse.json({
        success: true,
        data: count,
        message: '已清空所有敏感词',
      });
    }

    // 删除指定词汇
    const { words } = await req.json();

    if (!Array.isArray(words)) {
      return NextResponse.json({
        success: false,
        message: '词汇列表格式错误',
      }, { status: 400 });
    }

    // 从数据库删除
    const result = await wordDb.remove(words);

    // 重新初始化检测器
    const { initializeDetector } = await import('@/lib/detector');
    await initializeDetector();

    return NextResponse.json({
      success: true,
      data: result,
      message: `成功删除 ${result.removed_count} 个敏感词`,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '删除词汇失败: ' + error.message,
    }, { status: 500 });
  }
}
