import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, EMPTY } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { CourseDateValidationService } from '../service/course-date-validation.service';

@Injectable()
export class CourseDateValidationInterceptor implements HttpInterceptor {

  constructor(private courseDateValidation: CourseDateValidationService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Detectar llamadas que modifican fechas de curso
    if (this.shouldValidateRequest(req)) {
      return this.validateAndProceed(req, next);
    }

    return next.handle(req);
  }

  private shouldValidateRequest(req: HttpRequest<any>): boolean {
    const url = req.url.toLowerCase();
    const method = req.method.toUpperCase();

    // Detectar URLs que modifican course-dates
    const isCourseDateUrl = url.includes('/admin/course-dates') ||
                           url.includes('/admin/courses') && url.includes('/dates');

    // Solo interceptar DELETE y PUT/PATCH
    const isModifyingMethod = ['DELETE', 'PUT', 'PATCH'].includes(method);

    return isCourseDateUrl && isModifyingMethod;
  }

  private validateAndProceed(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const { courseId, dateId, action } = this.extractRequestInfo(req);

    if (!courseId || !dateId) {
      // Si no podemos extraer la info, continuar sin validación
      return next.handle(req);
    }

    // Mostrar diálogo de validación
    return this.courseDateValidation.showCourseDateModificationDialog({
      courseId,
      dateId,
      action,
      newDate: req.body?.date,
      newTime: req.body?.hour_start
    }).pipe(
      switchMap(canProceed => {
        if (canProceed) {
          return next.handle(req);
        } else {
          // Usuario canceló, no proceder con la petición
          return EMPTY;
        }
      }),
      catchError(() => {
        // En caso de error en la validación, proceder normalmente
        return next.handle(req);
      })
    );
  }

  private extractRequestInfo(req: HttpRequest<any>): {
    courseId: number | null;
    dateId: number | null;
    action: 'update' | 'delete';
  } {
    const url = req.url;
    const method = req.method.toUpperCase();

    // Extraer IDs de diferentes patrones de URL
    let courseId: number | null = null;
    let dateId: number | null = null;

    // Patrón: /admin/course-dates/123
    const courseDatePattern = /\/admin\/course-dates\/(\d+)/;
    const courseDateMatch = url.match(courseDatePattern);
    if (courseDateMatch) {
      dateId = parseInt(courseDateMatch[1]);
      // Necesitamos obtener el courseId mediante una llamada adicional o del body
      courseId = req.body?.course_id || this.extractCourseIdFromContext(req);
    }

    // Patrón: /admin/courses/123/dates/456
    const courseWithDatePattern = /\/admin\/courses\/(\d+)\/dates\/(\d+)/;
    const courseWithDateMatch = url.match(courseWithDatePattern);
    if (courseWithDateMatch) {
      courseId = parseInt(courseWithDateMatch[1]);
      dateId = parseInt(courseWithDateMatch[2]);
    }

    const action: 'update' | 'delete' = method === 'DELETE' ? 'delete' : 'update';

    return { courseId, dateId, action };
  }

  private extractCourseIdFromContext(req: HttpRequest<any>): number | null {
    // Intentar extraer courseId del cuerpo de la petición o headers
    if (req.body?.course_id) {
      return parseInt(req.body.course_id);
    }

    // Buscar en headers personalizados
    const courseIdHeader = req.headers.get('X-Course-Id');
    if (courseIdHeader) {
      return parseInt(courseIdHeader);
    }

    return null;
  }
}

// CONFIGURACIÓN DEL INTERCEPTOR
/*
Para usar este interceptor, agregar en app.module.ts:

import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { CourseDateValidationInterceptor } from './interceptors/course-date-validation.interceptor';

@NgModule({
  // ...
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: CourseDateValidationInterceptor,
      multi: true
    }
  ]
})
export class AppModule { }

NOTA: Este interceptor es OPCIONAL. Proporciona validación automática para todas
las llamadas HTTP que modifiquen fechas de curso, pero también se puede usar
solo el servicio de validación de forma manual en cada componente.
*/