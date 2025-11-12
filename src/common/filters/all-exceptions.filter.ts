import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';
import type { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private isPrismaKnownRequestError(exception: unknown): exception is PrismaClientKnownRequestError {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      'code' in exception &&
      'meta' in exception &&
      exception.constructor.name === 'PrismaClientKnownRequestError'
    );
  }

  private isPrismaValidationError(exception: unknown): exception is PrismaClientValidationError {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      exception.constructor.name === 'PrismaClientValidationError'
    );
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let details: any = undefined;

    // Handle HTTP Exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        details = responseObj;
      }
    }
    // Handle Prisma Exceptions
    else if (this.isPrismaKnownRequestError(exception)) {
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = 'Unique constraint violation';
          code = 'UNIQUE_CONSTRAINT_VIOLATION';
          const target = exception.meta?.target as string[] | undefined;
          details = {
            field: target?.[0] || 'unknown',
            message: `A record with this ${target?.[0] || 'field'} already exists`,
          };
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          code = 'NOT_FOUND';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'Foreign key constraint failed';
          code = 'FOREIGN_KEY_VIOLATION';
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          message = 'Database error';
          code = 'DATABASE_ERROR';
          details = { prismaCode: exception.code };
      }
    }
    else if (this.isPrismaValidationError(exception)) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Validation error in database query';
      code = 'VALIDATION_ERROR';
    }

    response.status(status).json({
      data: null,
      error: {
        message,
        code,
        details,
      },
      timestamp: new Date().toISOString(),
      path: ctx.getRequest().url,
    });
  }
}
