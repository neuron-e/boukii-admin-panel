import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientParticipantConflictDialogComponent } from './client-participant-conflict-dialog.component';

describe('ClientParticipantConflictDialogComponent', () => {
  let component: ClientParticipantConflictDialogComponent;
  let fixture: ComponentFixture<ClientParticipantConflictDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ClientParticipantConflictDialogComponent]
    });
    fixture = TestBed.createComponent(ClientParticipantConflictDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
