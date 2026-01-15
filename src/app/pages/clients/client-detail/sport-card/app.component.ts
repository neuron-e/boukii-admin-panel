import { Component, Input } from '@angular/core';
import {ClientDetailComponent} from '../client-detail.component';

@Component({
  selector: 'app-user-detail-sport-card',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class SportCardComponent {
  constructor(public user: ClientDetailComponent) { }
  @Input() selectedSport: any
  @Input() level: any
  @Input() goals: any
  @Input() evaluations: any
  @Input() border: boolean = true
  @Input() center: boolean = false
  expanded = false;
  editingGoalId: number | null = null;
  editingScore = 0;
  newComment = '';
  savingComment = false;
  uploadingFiles = false;

  calculateGoalsScore(): number {
    let ret = 0;
    if (this.selectedSport?.level) {
      const goalsx = this.goals.filter((g: any) => g.degree_id === this.level.id);
      const maxPoints = goalsx.length * 10;

      for (const goal of goalsx) {
        this.user.evaluationFullfiled.forEach((element: any) => {
          if (element.degrees_school_sport_goals_id === goal.id) {
            ret += element.score;
          }
        });
      }

      ret = ret > maxPoints ? maxPoints : ret;
      return maxPoints > 0 ? Math.round((ret / maxPoints) * 100) : 0;
    }

    return 0;
  }

  getDegreeScore(goal: any) {
    const d = this.user.evaluationFullfiled.find((element: any) => element.degrees_school_sport_goals_id === goal)
    if (d) return d.score
    return 0
  }

  toggleExpanded(): void {
    this.expanded = !this.expanded;
    if (this.expanded) {
      const evaluation = this.user.getEvaluationForLevel(this.level);
      if (evaluation?.id) {
        this.user.loadEvaluationComments(evaluation.id);
        this.user.loadEvaluationHistory(evaluation.id);
      }
    }
  }

  getEvaluation(): any {
    return this.user.getEvaluationForLevel(this.level);
  }

  getGoalsNotStarted(): number {
    return this.user.getGoalsNotStartedCount(this.goals || []);
  }

  getMediaCounts(): { images: number; videos: number } {
    return this.user.getMediaCounts(this.level);
  }

  startEditGoal(goalId: number): void {
    this.editingGoalId = goalId;
    this.editingScore = this.getDegreeScore(goalId);
  }

  cancelEditGoal(): void {
    this.editingGoalId = null;
    this.editingScore = 0;
  }

  async saveGoalEdit(goalId: number): Promise<void> {
    await this.user.updateGoalScore(this.level, goalId, this.editingScore);
    this.cancelEditGoal();
  }

  setEditingScore(score: number): void {
    this.editingScore = score;
  }

  async uploadFiles(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = input?.files ? Array.from(input.files) : [];
    if (!files.length) return;

    this.uploadingFiles = true;
    try {
      await this.user.addEvaluationFilesForLevel(this.level, files);
    } finally {
      this.uploadingFiles = false;
      input.value = '';
    }
  }

  async addComment(): Promise<void> {
    const text = this.newComment.trim();
    if (!text) return;
    this.savingComment = true;
    try {
      const evaluation = await this.user.ensureEvaluation(this.level);
      await this.user.addEvaluationComment(evaluation.id, text);
      this.newComment = '';
    } finally {
      this.savingComment = false;
    }
  }

  getGoalStatusLabel(goalId: any): string {
    const score = Number(this.getDegreeScore(goalId) || 0);
    return `${score}/10`;
  }

  getGoalStatusClass(goalId: any): string {
    const score = Number(this.getDegreeScore(goalId) || 0);
    if (score >= 10) return 'goal-status--done';
    if (score >= 5) return 'goal-status--partial';
    return 'goal-status--none';
  }

  getHistoryCount(): number {
    const evaluation = this.getEvaluation();
    if (!evaluation?.id) return 0;
    return this.user.getEvaluationHistory(evaluation.id).length;
  }

  getHistoryLastDate(): any {
    const evaluation = this.getEvaluation();
    if (!evaluation?.id) return null;
    const history = this.user.getEvaluationHistory(evaluation.id);
    return history.length ? history[0].created_at : null;
  }
}
