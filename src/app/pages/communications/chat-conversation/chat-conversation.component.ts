import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
  ViewChild
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ChatService } from '../chat.service';
import { MatMenuModule } from '@angular/material/menu';
import { NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fadeInUp400ms } from 'src/@vex/animations/fade-in-up.animation';
import { stagger20ms } from 'src/@vex/animations/stagger.animation';
import { VexScrollbarComponent } from 'src/@vex/components/vex-scrollbar/vex-scrollbar.component';
import { Chat, ChatMessage } from '../communications.component';
import { trackById } from 'src/@vex/utils/track-by';
import { chatMessages } from 'src/app/static-data/chat-messages';

@Component({
  selector: 'vex-chat-conversation',
  templateUrl: './chat-conversation.component.html',
  styleUrls: ['./chat-conversation.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeInUp400ms, stagger20ms],
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    NgIf,
    MatMenuModule,
    VexScrollbarComponent,
    NgFor,
    ReactiveFormsModule,
    MatDividerModule
  ]
})
export class ChatConversationComponent implements OnInit {
  chat?: Chat;
  messages!: ChatMessage[];

  form = new FormGroup({
    message: new FormControl<string>('', {
      nonNullable: true
    })
  });

  trackById = trackById;

  @ViewChild(VexScrollbarComponent)
  scrollbar?: VexScrollbarComponent;

  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.paramMap
      .pipe(
        map((paramMap) => paramMap.get('chatId')),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((chatId) => {
        this.messages = [];

        if (!chatId) {
          throw new Error('Chat id not found!');
        }

        this.cd.detectChanges();
        const chat = this.chatService.getChat(chatId);

        if (!chat) {
          throw new Error(`Chat with id ${chatId} not found!`);
        }

        this.chat = chat;
        this.chat.unreadCount = 0;
        this.filterMessages(chatId);
        this.cd.detectChanges();

        this.scrollToBottom();
      });
  }

  filterMessages(id: ChatMessage['id']) {
    this.messages = chatMessages.filter((message) => message.id === id);
  }

  send() {
    this.messages.push({
      id: Date.now(),
      chatId: typeof this.chat!.id === 'number' ? this.chat!.id : parseInt(this.chat!.id as string),
      from: 'me',
      sender: 'me',
      message: this.form.controls.message.getRawValue(),
      timestamp: new Date()
    });

    this.form.controls.message.setValue('');

    this.cd.detectChanges();
    this.scrollToBottom();
  }

  scrollToBottom() {
    if (!this.scrollbar) {
      return;
    }

    this.scrollbar.scrollbarRef?.getScrollElement()?.scrollTo({
      behavior: 'smooth',
      top: this.scrollbar.scrollbarRef.getContentElement()?.clientHeight
    });
  }

  openDrawer() {
    this.chatService.drawerOpen.next(true);
    this.cd.markForCheck();
  }

  closeDrawer() {
    this.chatService.drawerOpen.next(false);
    this.cd.markForCheck();
  }
}
