import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import { VexRoutes } from 'src/@vex/interfaces/vex-route.interface';
import { CoursesComponent } from './courses.component';
import { CoursesCreateUpdateComponent } from './courses-create-update/courses-create-update.component';
import { CourseDetailComponent } from './course-detail/course-detail.component';
import {CourseDetailNewComponent} from './course-detail-new/course-detail-new.component';


const routes: VexRoutes = [
  {
    path: '',
    component: CoursesComponent,
    data: {
      toolbarShadowEnabled: true
    }
  },
  {
    path: 'create',
    component: CoursesCreateUpdateComponent,
    data: {
      toolbarShadowEnabled: true
    }
  },
  {
    path: 'update/:id',
    component: CoursesCreateUpdateComponent,
    data: {
      toolbarShadowEnabled: true
    }
  },
  {
    path: 'detail/:id',
    component: CourseDetailComponent,
    data: {
      toolbarShadowEnabled: true
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CoursesRoutingModule {
}
