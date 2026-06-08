/**
 * Access Key 管理 API
 * GET /api/v1/access-keys - 获取 AK 列表
 * POST /api/v1/access-keys - 创建 AK
 */

import { NextRequest, NextResponse } from 'next/server';
import { accessKeyDb, generateAccessKey, generateSecretKey } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

// GET - 获取 AK 列表
export async function GET(req: NextRequest) {
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

    const keys = await accessKeyDb.list();

    return NextResponse.json({
      success: true,
      data: keys,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '获取 Access Key 列表失败: ' + error.message,
    }, { status: 500 });
  }
}

// POST - 创建 AK
export async function POST(req: NextRequest) {
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

    const { name, description, permissions, ip_whitelist, rate_limit, expires_at } = await req.json();

    if (!name) {
      return NextResponse.json({
        success: false,
        message: '名称不能为空',
      }, { status: 400 });
    }

    const key = await accessKeyDb.create({
      name,
      description: description || '',
      permissions: permissions || [],
      ip_whitelist: ip_whitelist || [],
      rate_limit: rate_limit || 1000,
      expires_at: expires_at || null,
      access_key: generateAccessKey(),
      secret_key: generateSecretKey(),
    });

    return NextResponse.json({
      success: true,
      data: key,
      message: 'Access Key 创建成功',
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '创建 Access Key 失败: ' + error.message,
    }, { status: 500 });
  }
}
