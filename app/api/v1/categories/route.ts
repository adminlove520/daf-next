/**
 * 分类信息 API
 * GET /api/v1/categories
 */

import { NextResponse } from 'next/server';
import { categoryDb } from '@/lib/db';

export async function GET() {
  try {
    const categories = await categoryDb.getAll();

    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '获取分类失败: ' + error.message,
    }, { status: 500 });
  }
}
