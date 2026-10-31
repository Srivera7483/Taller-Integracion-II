
#### Conceptos previos
---
- <span style="color:rgb(192, 0, 0)">PATCH vs. PUT</span>: El método PATCH es para actualizaciones parciales de recursos, y ya que en esta tarea se busca modificar solo el atributo rol del usuario, es la opción ideal.
- <span style="color:rgb(192, 0, 0)"><b>DTO</b></span> (*Data Transfer Object*): Es un objeto que permite validar que el texto de la petición HTTP cumpla con el dominio del contrato del proyecto.
	- Por ejemplo, en el caso del proyecto InfraManager se programaría así en la carpeta `src/auth/dto`:
	```typescript
			import { IsEnum, IsNotEmpty } from 'class-validator';
	
	export enum RoleEnum {
	  ADMINISTRADOR = 'ADMINISTRADOR',
	  SUPERVISOR = 'SUPERVISOR',
	  TECNICO = 'TECNICO',
	  REPORTANTE = 'REPORTANTE',
	}
	
	export class UpdateRoleDto {
	  @IsNotEmpty({ message: 'El campo rol es obligatorio' })
	  @IsEnum(RoleEnum, { message: 'El rol especificado no es válido' })
	  rol!: RoleEnum;
	}
	```
- Ya que esta tarea es paso sucesivo de TAL-46 (Guards), está impeque usar el Guard para resguardar la función de actualización de permisos.

![[Pasted image 20260924123309.png|176]]
- Siguiendo la lógica del diagrama de componentes, el flujo sería: `AuthController` recibe la petición, ejecuta los Guards y usa el DTO; `AuthLogic` valida reglas de negocio como la existencia del usuario, y la validación del token, y `UserRepository` ejecuta la acción en la BD mediante Prisma.


**Commit TAL-47**
- Se creó el DTO para usar el Enum y validar el tipo de rol nuevo.
- Se creó el `UserRepository`, ya que no existía (implicando cambiar el código original del `AuthService`, que se conectaba directamente a la BD con PrismaService, con un fix en dev) y lo importamos en `auth.module.ts`
	- Sobre `User Repository`:
		- Si el model de Prisma (`schema.prisma`) es en mayúscula, se referencia a esa clase en minúscula como atributo:
	```typescript
		async findById(id: string) {
		    return await this.prisma.user.findUnique({
				where: { id_usuario: id },
			});
		}
	```


- Se generó la función correspondiente en el `AuthService` para cambiar el rol de un usuario: `updateUserRole()`
- Eliminamos la función de prueba original que habíamos hecho en TAL-46 para probar el Guard, ya que ahora tenemos una real que usa el Guard, y es la que da acceso a `updateUserRole()` de AuthService: es la homónima en `AuthController`.
