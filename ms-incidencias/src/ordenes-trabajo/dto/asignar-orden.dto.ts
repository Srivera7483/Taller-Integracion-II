export class AsignarOrdenDto {
  incidencia_id!: string;
  tecnico_id!: string;
  instrucciones?: string;
  prioridad?: 'Alta' | 'Media' | 'Baja' | string;
  supervisor_id?: string;
}

