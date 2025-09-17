import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import { VexRoutes } from 'src/@vex/interfaces/vex-route.interface';
import { CommunicationsComponent } from './communications.component';
import { ChatEmptyComponent } from './chat-empty/chat-empty.component';
import { ChatConversationComponent } from './chat-conversation/chat-conversation.component';

const routes: VexRoutes = [
  {
    path: '',
    component: CommunicationsComponent,
    data: {
      scrollDisabled: true,
      toolbarShadowEnabled: false,
      footerVisible: false
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CommunicationsRoutingModule {
}
