import { NgZone } from '@angular/core';
import { HighlightDirective } from './highlight.directive';
import { HighlightService } from './highlight.service';

describe('HighlightDirective', () => {
  it('should create an instance', () => {
    const mockHighlightService = jasmine.createSpyObj('HighlightService', ['highlight']);
    const mockNgZone = jasmine.createSpyObj('NgZone', ['run']);
    
    const directive = new HighlightDirective(mockHighlightService, mockNgZone);
    expect(directive).toBeTruthy();
  });
});
