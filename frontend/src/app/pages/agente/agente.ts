import { Component, inject, signal, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SearchService, AgenteChatFonte } from '../../services/search';

interface ChatMessage {
  role: 'user' | 'agent';
  text: string;
  fontes?: AgenteChatFonte[];
}

const STARTER_PROMPTS = [
  'Quais pesquisadores trabalham com Inteligência Artificial?',
  'Quais as produções mais recentes sobre aprendizado de máquina?',
  'Existem trabalhos sobre computação quântica?',
  'Quais artigos abordam processamento de linguagem natural?',
];

@Component({
  selector: 'app-agente',
  imports: [FormsModule, RouterLink],
  templateUrl: './agente.html',
  styleUrl: './agente.scss',
})
export class Agente implements AfterViewChecked {
  private readonly searchService = inject(SearchService);

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLElement>;

  messages = signal<ChatMessage[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  inputText = '';
  readonly starterPrompts = STARTER_PROMPTS;
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
    this.messages.update(msgs => [...msgs, { role: 'user', text }]);
    this.inputText = '';
    this.loading.set(true);
    this.shouldScrollToBottom = true;

    this.searchService.perguntarAgente(text).subscribe({
      next: (resp) => {
        this.messages.update(msgs => [
          ...msgs,
          { role: 'agent', text: resp.resposta, fontes: resp.fontes },
        ]);
        this.loading.set(false);
        this.shouldScrollToBottom = true;
      },
      error: () => {
        this.error.set('Nao foi possivel obter resposta do agente. Tente novamente.');
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
