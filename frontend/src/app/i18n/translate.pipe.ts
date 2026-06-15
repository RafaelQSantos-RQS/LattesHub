import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from './translation.service';

@Pipe({
  name: 'translate',
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private readonly service = inject(TranslationService);

  transform(key: string): string {
    return this.service.translate(key);
  }
}
