export const showSuccessHtml = (email: string) => `
<html>
  <head>
    <title>邮件回复已批准</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { 
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
        max-width: 600px; 
        margin: 0 auto; 
        padding: 40px 20px; 
        text-align: center; 
        background-color: #f9fafb;
        line-height: 1.6;
      }
      .container {
        background-color: white;
        border-radius: 12px;
        padding: 32px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      }
      .icon {
        font-size: 48px;
        margin-bottom: 16px;
      }
      .success { 
        color: #10b981; 
        margin-bottom: 16px;
      }
      .info { 
        color: #6b7280; 
        font-size: 16px;
      }
      .email {
        font-weight: 600;
        color: #374151;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="icon">✅</div>
      <h1 class="success">邮件回复已批准！</h1>
      <p>您的批准已收到。系统将立即发送回复邮件至 <span class="email">${email}</span>。</p>
      <p class="info">您现在可以关闭此窗口。</p>
    </div>
  </body>
</html>
`;

export const showExpiredHtml = () => `
<html>
  <head>
    <title>无效或过期的链接</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { 
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
        max-width: 600px; 
        margin: 0 auto; 
        padding: 40px 20px; 
        text-align: center; 
        background-color: #f9fafb;
        line-height: 1.6;
      }
      .container {
        background-color: white;
        border-radius: 12px;
        padding: 32px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      }
      .icon {
        font-size: 48px;
        margin-bottom: 16px;
      }
      .error { 
        color: #e11d48; 
        margin-bottom: 16px;
      }
      .info { 
        color: #6b7280; 
        font-size: 16px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="icon">❌</div>
      <h1 class="error">无效或过期的链接</h1>
      <p class="info">此审批链接已不再有效。邮件可能已被批准或审批时间已过期。</p>
    </div>
  </body>
</html>
`;

export const showErrorHtml = (error: Error) => `
<html>
  <head>
    <title>处理错误</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { 
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
        max-width: 600px; 
        margin: 0 auto; 
        padding: 40px 20px; 
        text-align: center; 
        background-color: #f9fafb;
        line-height: 1.6;
      }
      .container {
        background-color: white;
        border-radius: 12px;
        padding: 32px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      }
      .icon {
        font-size: 48px;
        margin-bottom: 16px;
      }
      .error { 
        color: #e11d48; 
        margin-bottom: 16px;
      }
      .info { 
        color: #6b7280; 
        font-size: 16px;
      }
      .error-details {
        margin-top: 16px;
        padding: 12px;
        background-color: #fef2f2;
        border-radius: 8px;
        font-size: 14px;
        color: #b91c1c;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="icon">⚠️</div>
      <h1 class="error">处理批准请求时出错</h1>
      <p class="info">在处理您的批准请求时发生了错误。</p>
      <div class="error-details">${error instanceof Error ? error.message : String(error)}</div>
      <p class="info">请尝试重新发送邮件。</p>
    </div>
  </body>
</html>
`;
