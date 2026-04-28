import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from '../../../environments/environment';
import { UserListResponse, CambioEstadoUsuarioRequest, PersonaRegistroDTO } from "../../data/interfaces/user.interface";

@Injectable({
    providedIn: "root",
})
export class UserService {
    private apiUrl = `${environment.apiUrl}/api/usuarios`;
    private apiPersonaUrl = `${environment.apiUrl}/api/persona`;

    constructor(private http: HttpClient) { }

    getUsuarios(): Observable<UserListResponse[]> {
        return this.http.get<UserListResponse[]>(`${this.apiUrl}/listar`);
    }

    toggleEstado(datos: CambioEstadoUsuarioRequest): Observable<any> {
        return this.http.patch(`${this.apiUrl}/cambiar-estado`, datos);
    }

    eliminarPersona(personaId: string): Observable<any> {
        return this.http.delete(`${this.apiPersonaUrl}/${personaId}`);
    }

    registarUsuario(datos: PersonaRegistroDTO): Observable<any> {
        return this.http.post(`${this.apiPersonaUrl}/registrar-personal`, datos);
    }

    registrarCliente(datos: PersonaRegistroDTO): Observable<any> {
        return this.http.post(`${this.apiPersonaUrl}/registrar-cliente`, datos);
    }
}