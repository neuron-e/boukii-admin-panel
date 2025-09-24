import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'vex-client-participant-conflict-dialog',
  templateUrl: './client-participant-conflict-dialog.component.html',
  styleUrls: ['./client-participant-conflict-dialog.component.scss']
})
export class ClientParticipantConflictDialogComponent {
  selectedSolution: string = '';
  selectedNewMainClient: any = null;

  // Opciones de solución disponibles
  solutionOptions = [
    {
      value: 'change_main_client',
      label: 'Cambiar cliente principal',
      description: 'Usar uno de los participantes como cliente principal'
    },
    {
      value: 'remove_participants',
      label: 'Remover participantes problemáticos',
      description: 'Eliminar participantes que no pertenecen al cliente principal'
    },
    {
      value: 'create_relationship',
      label: 'Crear relación familiar (recomendado)',
      description: 'Crear relación entre el cliente principal y los participantes'
    }
  ];

  constructor(
    public dialogRef: MatDialogRef<ClientParticipantConflictDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private translateService: TranslateService
  ) {}

  // Obtener participantes que podrían ser clientes principales
  getPotentialMainClients(): any[] {
    const allParticipants = [];

    this.data.normalizedDates.forEach(date => {
      if (date.utilizers) {
        date.utilizers.forEach(utilizer => {
          if (!allParticipants.find(p => p.id === utilizer.id)) {
            allParticipants.push(utilizer);
          }
        });
      }
    });

    return allParticipants;
  }

  // Obtener participantes problemáticos (que no pertenecen al cliente principal)
  getProblematicParticipants(): any[] {
    const validClientIds = [this.data.mainClient.id];
    if (this.data.utilizers) {
      this.data.utilizers.forEach(utilizer => {
        if (utilizer.id !== this.data.mainClient.id) {
          validClientIds.push(utilizer.id);
        }
      });
    }

    const problematicParticipants = [];
    this.data.normalizedDates.forEach(date => {
      if (date.utilizers) {
        date.utilizers.forEach(utilizer => {
          if (!validClientIds.includes(utilizer.id) &&
              !problematicParticipants.find(p => p.id === utilizer.id)) {
            problematicParticipants.push(utilizer);
          }
        });
      }
    });

    return problematicParticipants;
  }

  onSolutionSelected(solution: string): void {
    this.selectedSolution = solution;
  }

  onNewMainClientSelected(client: any): void {
    this.selectedNewMainClient = client;
  }

  applySolution(): void {
    let solutionData: any = {
      action: this.selectedSolution
    };

    switch (this.selectedSolution) {
      case 'change_main_client':
        if (!this.selectedNewMainClient) {
          return;
        }
        solutionData.newMainClient = this.selectedNewMainClient;
        break;

      case 'remove_participants':
        solutionData.participantsToRemove = this.getProblematicParticipants().map(p => p.id);
        break;

      case 'create_relationship':
        solutionData.mainClientId = this.data.mainClient.id;
        solutionData.participantsToLink = this.getProblematicParticipants().map(p => p.id);
        break;
    }

    this.dialogRef.close(solutionData);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
