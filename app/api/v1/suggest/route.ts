/**
 * 建议检测 API
 * POST /api/v1/suggest - 获取建议的敏感词
 * POST /api/v1/suggest/word - 根据词汇获取建议
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDetector } from '@/lib/detector';

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const isWord = url.pathname.endsWith('/word');

    const { text, word, limit = 10 } = await req.json();

    const searchInput = isWord ? word : text;

    if (!searchInput) {
      return NextResponse.json({
        success: false,
        message: '输入不能为空',
      }, { status: 400 });
    }

    // 确保检测器已初始化
    const { initializeDetector } = await import('@/lib/detector');
    await initializeDetector();

    const detector = getDetector();
    const suggestions = detector.suggest(searchInput, limit);

    return NextResponse.json({ success: true, data: suggestions });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '建议检测失败: ' + error.message,
    }, { status: 500 });
  }
}
