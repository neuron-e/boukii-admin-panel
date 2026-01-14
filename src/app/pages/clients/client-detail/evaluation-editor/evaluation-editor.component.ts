import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { ApiCrudService } from 'src/service/crud.service';

interface EvaluationEditorDialogData {
  clientId: number;
  level: any;
  sport: any;
  goals: any[];
  evaluations: any[];
  clientSport: any[];
}

@Component({
  selector: 'vex-evaluation-editor',
  templateUrl: './evaluation-editor.component.html',
  styleUrls: ['./evaluation-editor.component.scss']
})
export class EvaluationEditorComponent {
  evaluations: any[] = [];
  selectedEvaluationId: number | 'new' = 'new';
  observations = '';
  goalStates: any[] = [];
  files: any[] = [];
  deletedFileIds: number[] = [];
  logs: any[] = [];
  loadingLogs = false;
  saving = false;
  updateClientLevel = false;

  constructor(
    private dialogRef: MatDialogRef<EvaluationEditorComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EvaluationEditorDialogData,
    private crudService: ApiCrudService,
    private snackbar: MatSnackBar
  ) {
    this.evaluations = [...(data.evaluations || [])].sort((a, b) => b.id - a.id);
    const latest = this.evaluations[0] || null;
    this.selectedEvaluationId = latest ? latest.id : 'new';
    this.applyEvaluationSelection();
  }

  get hasExistingEvaluation(): boolean {
    return this.selectedEvaluationId !== 'new';
  }

  close(): void {
    this.dialogRef.close(false);
  }

  onEvaluationChange(): void {
    this.applyEvaluationSelection();
  }

  async save(): Promise<void> {
    if (this.saving) return;
    this.saving = true;
    try {
      const evaluationId = await this.saveEvaluation();
      await this.saveGoals(evaluationId);
      await this.saveFiles(evaluationId);
      if (this.updateClientLevel) {
        await this.updateClientSport();
      }
      this.snackbar.open('Evaluation saved', 'OK', { duration: 2500 });
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Evaluation save error:', error);
      this.snackbar.open('Failed to save evaluation', 'OK', { duration: 4000 });
    } finally {
      this.saving = false;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input?.files ? Array.from(input.files) : [];
    if (!files.length) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        if (!result) return;
        const type = file.type.startsWith('video/') ? 'video' : 'image';
        this.files.push({ type, file: result });
      };
      reader.readAsDataURL(file);
    });

    input.value = '';
  }

  removeFile(file: any, index: number): void {
    if (file?.id) {
      this.deletedFileIds.push(file.id);
    }
    this.files.splice(index, 1);
  }

  trackGoalById(index: number, item: any): number {
    return item?.id || index;
  }

  getLogLabel(log: any): string {
    if (!log?.causer) return 'System';
    if (log.causer.name) return log.causer.name;
    const first = log.causer.first_name || '';
    const last = log.causer.last_name || '';
    const full = `${first} ${last}`.trim();
    return full || 'User';
  }

  getLogDetails(log: any): string {
    const changes = log?.properties || {};
    const attributes = changes.attributes || {};
    const old = changes.old || {};
    const keys = Object.keys(attributes);
    if (!keys.length) return '';

    return keys.map((key: string) => {
      const before = this.formatLogValue(old[key]);
      const after = this.formatLogValue(attributes[key]);
      if (before === after) {
        return `${key}: ${after}`;
      }
      return `${key}: ${before} -> ${after}`;
    }).join(' | ');
  }

  private applyEvaluationSelection(): void {
    const evaluation = this.evaluations.find(ev => ev.id === this.selectedEvaluationId) || null;
    this.observations = evaluation?.observations || '';
    this.deletedFileIds = [];
    this.files = evaluation?.files ? [...evaluation.files] : [];

    const goalsById = new Map<number, any>();
    if (evaluation?.evaluation_fulfilled_goals) {
      evaluation.evaluation_fulfilled_goals.forEach((goal: any) => {
        goalsById.set(goal.degrees_school_sport_goals_id, goal);
      });
    }

    this.goalStates = (this.data.goals || []).map(goal => {
      const existing = goalsById.get(goal.id);
      return {
        ...goal,
        score: existing ? existing.score : 0,
        update_id: existing ? existing.id : null
      };
    });

    if (this.hasExistingEvaluation) {
      this.loadLogs();
    } else {
      this.logs = [];
    }
  }

  private async loadLogs(): Promise<void> {
    if (!this.hasExistingEvaluation) return;
    this.loadingLogs = true;
    try {
      const response: any = await firstValueFrom(
        this.crudService.get(`/admin/evaluations/${this.selectedEvaluationId}/activity`)
      );
      this.logs = response?.data || [];
    } catch (error) {
      console.error('Failed to load evaluation logs:', error);
      this.logs = [];
    } finally {
      this.loadingLogs = false;
    }
  }

  private async saveEvaluation(): Promise<number> {
    const payload = {
      client_id: this.data.clientId,
      degree_id: this.data.level.id,
      observations: this.observations || ''
    };

    if (this.selectedEvaluationId === 'new') {
      const response: any = await firstValueFrom(this.crudService.create('/evaluations', payload));
      this.selectedEvaluationId = response.data.id;
      return response.data.id;
    }

    await firstValueFrom(
      this.crudService.update('/evaluations', payload, this.selectedEvaluationId)
    );

    return this.selectedEvaluationId as number;
  }

  private async saveGoals(evaluationId: number): Promise<void> {
    const requests = this.goalStates.map(goal => {
      const goalPayload = {
        evaluation_id: evaluationId,
        degrees_school_sport_goals_id: goal.id,
        score: goal.score || 0
      };

      if (goal.update_id) {
        return firstValueFrom(
          this.crudService.update('/evaluation-fulfilled-goals', goalPayload, goal.update_id)
        );
      }

      return firstValueFrom(this.crudService.create('/evaluation-fulfilled-goals', goalPayload));
    });

    await Promise.all(requests);
  }

  private async saveFiles(evaluationId: number): Promise<void> {
    const createRequests = this.files
      .filter(file => !file.id)
      .map(file => {
        const payload = {
          evaluation_id: evaluationId,
          name: '',
          type: file.type,
          file: file.file
        };
        return firstValueFrom(this.crudService.create('/evaluation-files', payload));
      });

    const deleteRequests = this.deletedFileIds.map(fileId =>
      firstValueFrom(this.crudService.delete('/evaluation-files', fileId))
    );

    await Promise.all([...createRequests, ...deleteRequests]);
  }

  private async updateClientSport(): Promise<void> {
    const clientSport = (this.data.clientSport || []).find((sport: any) =>
      sport.client_id === this.data.clientId && sport.sport_id === this.data.level.sport_id
    );

    const payload = {
      client_id: this.data.clientId,
      sport_id: this.data.level.sport_id,
      degree_id: this.data.level.id
    };

    if (clientSport?.id) {
      await firstValueFrom(this.crudService.update('/client-sports', payload, clientSport.id));
      return;
    }

    await firstValueFrom(this.crudService.create('/client-sports', payload));
  }

  private formatLogValue(value: any): string {
    if (value === null || value === undefined || value === '') return 'empty';
    const text = String(value);
    if (text.length > 60) {
      return `${text.slice(0, 57)}...`;
    }
    return text;
  }
}
