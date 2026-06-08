'use client';

import { useEffect, useRef } from 'react';

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 动态导入 Vue 应用
    import('./vue-app').then(({ mountVueApp }) => {
      mountVueApp();
    });
  }, []);

  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>敏感词检测管理后台</title>
      </head>
      <body>
        <div ref={containerRef} id="vue-app" />
      </body>
    </html>
  );
}
