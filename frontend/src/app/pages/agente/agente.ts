import {
  Component,
  computed,
  inject,
  signal,
  ElementRef,
  ViewChild,
  AfterViewChecked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SearchService, AgenteChatFonte } from '../../services/search';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { TranslationService } from '../../i18n/translation.service';

interface ChatMessage {
  role: 'user' | 'agent';
  text: string;
  fontes?: AgenteChatFonte[];
}

@Component({
  selector: 'app-agente',
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './agente.html',
  styleUrl: './agente.scss',
})
export class Agente implements AfterViewChecked {
  private readonly searchService = inject(SearchService);
  private readonly i18n = inject(TranslationService);

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLElement>;

  messages = signal<ChatMessage[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  inputText = '';
  readonly starterPrompts = computed(() => [
    this.i18n.translate('agente.prompt1'),
    this.i18n.translate('agente.prompt2'),
    this.i18n.translate('agente.prompt3'),
    this.i18n.translate('agente.prompt4'),
  ]);
  private shouldScrollToBottom = false;

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  send(pergunta?: string) {
    const text = (pergunta ?? this.inputText).trim();
    if (!text || this.loading()) return;

    this.error.set(null);
    this.messages.update((msgs) => [...msgs, { role: 'user', text }]);
    this.inputText = '';
    this.loading.set(true);
    this.shouldScrollToBottom = true;

    this.searchService.perguntarAgente(text).subscribe({
      next: (resp) => {
        this.messages.update((msgs) => [
          ...msgs,
          { role: 'agent', text: resp.resposta, fontes: resp.fontes },
        ]);
        this.loading.set(false);
        this.shouldScrollToBottom = true;
      },
      error: () => {
        this.error.set(this.i18n.translate('agente.erro'));
        this.loading.set(false);
      },
    });
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  private scrollToBottom() {
    const el = this.messagesContainer?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
