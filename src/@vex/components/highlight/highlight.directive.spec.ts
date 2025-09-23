import { NgZone } from '@angular/core';
import { HighlightDirective } from './highlight.directive';
import { HighlightService } from './highlight.service';

describe('HighlightDirective', () => {
  it('should create an instance', () => {
    const mockHighlightService = jasmine.createSpy('HighlightService');
    const mockNgZone = jasmine.createSpy('NgZone');
    const directive = new HighlightDirective(mockHighlightService as any, mockNgZone as any);
    expect(directive).toBeTruthy();
  });
});
