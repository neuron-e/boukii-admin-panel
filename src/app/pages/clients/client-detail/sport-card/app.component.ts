import { Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {ClientDetailComponent} from '../client-detail.component';

@Component({
  selector: 'app-user-detail-sport-card',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class SportCardComponent {
  constructor(public user: ClientDetailComponent, private translateService: TranslateService) { }
  @Input() selectedSport: any
  @Input() level: any
  @Input() goals: any
  @Input() evaluations: any
  @Input() border: boolean = true
  @Input() center: boolean = false
  expanded = false;
  editingGoalId: number | null = null;
  editingScore: number | null = 0;
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
    const d = this.user.evaluationFullfiled.find((element: any) => element.degrees_school_sport_goals_id === goal);
    if (d) return d.score;
    return null;
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

  hasEvaluation(): boolean {
    return !!this.getEvaluation()?.id;
  }

  hasEvaluationGoals(): boolean {
    const evaluation = this.getEvaluation();
    if (!evaluation?.id) return false;
    return (this.user.evaluationFullfiled || []).some((item: any) => item.evaluation_id === evaluation.id);
  }

  getGoalsToImprove(): number {
    if (!this.hasEvaluationGoals()) return 0;
    const goals = this.goals || [];
    let count = 0;
    goals.forEach((goal: any) => {
      if (this.getDegreeScore(goal.id) === 0) {
        count += 1;
      }
    });
    return count;
  }

  getGoalsNoEvaluation(): number {
    if (this.hasEvaluationGoals()) return 0;
    return (this.goals || []).length;
  }

  getGoalsCompleted(): number {
    return this.user.getGoalsCompletedCount(this.goals || []);
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
    if (this.editingScore === null || this.editingScore === undefined) {
      await this.user.clearGoalScore(this.level, goalId);
    } else {
      await this.user.updateGoalScore(this.level, goalId, this.editingScore);
    }
    this.cancelEditGoal();
  }

  setEditingScore(score: number | null): void {
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

  getCommentAuthor(comment: any): string {
    const monitor = comment?.monitor;
    if (monitor) {
      const name = [monitor.first_name, monitor.last_name].filter(Boolean).join(' ').trim()
        || monitor.name
        || monitor.email
        || '';
      const roleLabel = this.translateService.instant('history_role_monitor');
      if (name) return `${name} (${roleLabel})`;
    }
    return this.getUserDisplayLabel(comment?.user);
  }

  getGoalStatusLabel(goalId: any): string {
    const score = this.getDegreeScore(goalId);
    if (score === null || score === undefined) {
      return this.translateService.instant('not_started');
    }
    const normalized = Number(score || 0);
    return normalized >= 10
      ? this.translateService.instant('achieved')
      : this.translateService.instant('to_improve');
  }

  getGoalStatusClass(goalId: any): string {
    const score = this.getDegreeScore(goalId);
    if (score === null || score === undefined) {
      return 'goal-status--none';
    }
    const normalized = Number(score || 0);
    return normalized >= 10 ? 'goal-status--done' : 'goal-status--partial';
  }

  isGoalClearable(goalId: number): boolean {
    return this.getDegreeScore(goalId) !== null && this.getDegreeScore(goalId) !== undefined;
  }

  async clearGoalScore(goalId: number): Promise<void> {
    if (!this.isGoalClearable(goalId)) return;
    await this.user.clearGoalScore(this.level, goalId);
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

  getProgressClass(): string {
    const progress = this.calculateGoalsScore();
    if (progress >= 100) return 'progress--complete';
    if (progress > 0) return 'progress--partial';
    return 'progress--empty';
  }

  private getUserDisplayLabel(user: any): string {
    if (!user) return this.translateService.instant('history_change_system');
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    const roleLabel = this.getUserRoleLabel(user);
    if (name && roleLabel) return `${name} (${roleLabel})`;
    if (name) return name;
    if (roleLabel) return roleLabel;
    return this.translateService.instant('history_change_system');
  }

  private getUserRoleLabel(user: any): string | null {
    const type = user?.type;
    if (type === 1 || type === 'admin') return this.translateService.instant('history_role_admin');
    if (type === 3 || type === 'monitor') return this.translateService.instant('history_role_monitor');
    return null;
  }
}
