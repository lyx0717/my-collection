import type { ErrorCode } from '@my-collection/shared/types'

/** 业务错误；由 app.ts 的 setErrorHandler 统一转成 { error: { code, message } } */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message)
  }
}

export const badRequest = (message: string) => new AppError(400, 'VALIDATION', message)
export const unauthenticated = (message = '请先登录') => new AppError(401, 'UNAUTHENTICATED', message)
export const notFound = (message = '资源不存在') => new AppError(404, 'NOT_FOUND', message)
export const conflict = (message: string) => new AppError(409, 'CONFLICT', message)
