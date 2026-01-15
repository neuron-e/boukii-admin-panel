import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';

interface EvaluationHistoryDialogData {
  level: any;
  sport: any;
  goals: any[];
  evaluation: any;
  history: any[];
}

@Component({
  selector: 'vex-evaluation-history',
  templateUrl: './evaluation-history.component.html',
  styleUrls: ['./evaluation-history.component.scss']
})
export class EvaluationHistoryComponent implements OnInit {
  historyEntries: any[] = [];
  mediaFiles: any[] = [];
  mediaUploaders: {[key: number]: string} = {};

  constructor(
    private dialogRef: MatDialogRef<EvaluationHistoryComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EvaluationHistoryDialogData,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    const history = this.data.history || [];
    this.historyEntries = history.map(entry => this.mapHistoryEntry(entry));
    this.mediaFiles = this.data.evaluation?.files || [];
    this.mediaUploaders = this.buildMediaUploaders(history);
  }

  close(): void {
    this.dialogRef.close();
  }

  getStatusLabel(score: number): string {
    if (score >= 10) return 'achieved';
    if (score >= 5) return 'to_improve';
    return 'not_started';
  }

  getChangeClass(type: string): string {
    switch (type) {
      case 'goal_created':
        return 'change--goal';
      case 'goal_updated':
        return 'change--goal';
      case 'goal_deleted':
        return 'change--goal';
      case 'observation_updated':
        return 'change--note';
      case 'file_added':
      case 'file_deleted':
        return 'change--file';
      default:
        return 'change--generic';
    }
  }

  getUserLabel(user: any): string {
    if (!user) {
      return this.translate.instant('history_change_system');
    }

    const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    return name || user.username || user.email || this.translate.instant('history_change_system');
  }

  getMediaUploader(file: any): string {
    if (!file?.id) return this.translate.instant('history_change_system');
    return this.mediaUploaders[file.id] || this.translate.instant('history_change_system');
  }

  private mapHistoryEntry(entry: any): any {
    const payload = entry?.payload || {};
    const goalName = this.getGoalName(payload.goal_id);
    const details: Array<{labelKey: string; value: string}> = [];
    let titleKey = 'history_change_generic';
    let contextLabel = '';

    switch (entry?.type) {
      case 'goal_created': {
        titleKey = 'history_change_goal_created';
        contextLabel = goalName;
        details.push({
          labelKey: 'history_change_goal_label',
          value: goalName || '-'
        });
        details.push({
          labelKey: 'history_change_status_label',
          value: this.getStatusText(payload.score)
        });
        break;
      }
      case 'goal_updated': {
        titleKey = 'history_change_goal_updated';
        contextLabel = goalName;
        const previousScore = payload.previous_score ?? this.getCurrentGoalScore(payload.goal_id);
        const nextScore = payload.score ?? previousScore;
        details.push({
          labelKey: 'history_change_goal_label',
          value: goalName || '-'
        });
        details.push({
          labelKey: 'history_change_status_label',
          value: `${this.getStatusText(previousScore)} -> ${this.getStatusText(nextScore)}`
        });
        break;
      }
      case 'goal_deleted': {
        titleKey = 'history_change_goal_deleted';
        contextLabel = goalName;
        const previousScore = payload.previous_score ?? payload.score ?? 0;
        details.push({
          labelKey: 'history_change_goal_label',
          value: goalName || '-'
        });
        details.push({
          labelKey: 'history_change_status_label',
          value: this.getStatusText(previousScore)
        });
        break;
      }
      case 'observation_updated': {
        titleKey = 'history_change_observation_updated';
        details.push({
          labelKey: 'history_change_previous_label',
          value: this.formatObservation(payload.previous)
        });
        details.push({
          labelKey: 'history_change_new_label',
          value: this.formatObservation(payload.new)
        });
        break;
      }
      case 'file_added': {
        titleKey = 'history_change_file_added';
        details.push({
          labelKey: 'history_change_file_label',
          value: this.getFileDescription(payload)
        });
        break;
      }
      case 'file_deleted': {
        titleKey = 'history_change_file_deleted';
        details.push({
          labelKey: 'history_change_file_label',
          value: this.getFileDescription(payload)
        });
        break;
      }
      default:
        break;
    }

    return {
      id: entry?.id,
      type: entry?.type,
      titleKey,
      contextLabel,
      details: details.length ? details : [],
      date: entry?.created_at,
      userLabel: this.getUserLabel(entry?.user)
    };
  }

  private getStatusText(score: number): string {
    return this.translate.instant(this.getStatusLabel(score ?? 0));
  }

  private getGoalName(goalId: number): string {
    if (!goalId) return '';
    const goal = (this.data.goals || []).find(item => item.id === goalId);
    return goal?.name || '';
  }

  private formatObservation(value: string): string {
    const text = (value || '').trim();
    if (!text) return '-';
    if (text.length <= 160) return text;
    return `${text.slice(0, 157)}...`;
  }

  private getFileDescription(payload: any): string {
    const fileType = payload?.file_type || '';
    const file = payload?.file || '';
    if (file) {
      const fileName = file.split('/').pop();
      if (fileType) {
        return `${fileType} - ${fileName}`;
      }
      return fileName || file;
    }
    return fileType || '-';
  }

  private buildMediaUploaders(history: any[]): {[key: number]: string} {
    const map: {[key: number]: string} = {};
    history.forEach(entry => {
      if (entry?.type !== 'file_added') return;
      const fileId = entry?.payload?.file_id;
      if (!fileId || map[fileId]) return;
      map[fileId] = this.getUserLabel(entry?.user);
    });
    return map;
  }

  private getCurrentGoalScore(goalId: number): number {
    const evaluationGoals = this.data.evaluation?.evaluation_fulfilled_goals || [];
    const current = evaluationGoals.find((item: any) => item.degrees_school_sport_goals_id === goalId);
    return current?.score ?? 0;
  }
}
