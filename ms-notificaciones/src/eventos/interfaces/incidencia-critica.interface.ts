export class IncidenciaCriticaMensaje {
  evento?: string;
  id_incidencia!: string;
  id_activo!: string;
  id_reportante!: string;
  titulo!: string;
  descripcion!: string;
  prioridad!: string;
  fecha_creacion!: Date | string;
  estado?: string | null;
}
