/**
 * WebScan 任务管理 API
 * POST /api/v1/webscan/tasks - 创建任务
 * GET /api/v1/webscan/tasks - 获取任务列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/auth';
import { createTask, listTasks } from '@/lib/webscan';

// POST - 创建扫描任务
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

    const config = await req.json();
    const task = createTask(config, payload.username);

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '创建任务失败: ' + error.message,
    }, { status: 500 });
  }
}

// GET - 获取任务列表
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

    const tasks = listTasks();

    return NextResponse.json({
      success: true,
      data: tasks,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '获取任务列表失败: ' + error.message,
    }, { status: 500 });
  }
}
