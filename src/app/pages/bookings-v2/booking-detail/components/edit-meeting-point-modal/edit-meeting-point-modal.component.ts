import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MeetingPointService } from 'src/service/meeting-point.service';

@Component({
  selector: 'vex-edit-meeting-point-modal',
  templateUrl: './edit-meeting-point-modal.component.html',
  styleUrls: ['./edit-meeting-point-modal.component.scss']
})
export class EditMeetingPointModalComponent implements OnInit {
  meetingPoints: any[] = [];
  selectedMeetingPointId: number | null = null;
  meetingPointName: string = '';
  meetingPointAddress: string = '';
  meetingPointInstructions: string = '';
  loading: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: {
      meetingPointName: string;
      meetingPointAddress: string;
      meetingPointInstructions: string;
    },
    private dialogRef: MatDialogRef<EditMeetingPointModalComponent>,
    private meetingPointService: MeetingPointService
  ) {}

  ngOnInit(): void {
    this.meetingPointName = this.data.meetingPointName || '';
    this.meetingPointAddress = this.data.meetingPointAddress || '';
    this.meetingPointInstructions = this.data.meetingPointInstructions || '';
    this.loadMeetingPoints();
  }

  loadMeetingPoints(): void {
    this.loading = true;
    this.meetingPointService.list({ active: true }).subscribe({
      next: (response: any) => {
        this.meetingPoints = response.data || [];
        this.loading = false;
      },
      error: () => {
        this.meetingPoints = [];
        this.loading = false;
      }
    });
  }

  onMeetingPointSelect(pointId: number): void {
    const selected = this.meetingPoints.find(p => p.id === pointId);
    if (selected) {
      this.meetingPointName = selected.name;
      this.meetingPointAddress = selected.address || '';
      this.meetingPointInstructions = selected.instructions || '';
    }
  }

  save(): void {
    this.dialogRef.close({
      meeting_point: this.meetingPointName,
      meeting_point_address: this.meetingPointAddress,
      meeting_point_instructions: this.meetingPointInstructions
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
