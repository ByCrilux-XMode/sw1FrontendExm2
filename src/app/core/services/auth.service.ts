import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { AuthResponse, LoginRequest } from "../../data/interfaces/auth.interface";
import { Observable, tap } from "rxjs";
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiURL = `${environment.apiUrl}/api/auth`;
    constructor(private http: HttpClient) { }

    login(credentials: LoginRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiURL}/login`, credentials).pipe(
            tap(res => {
                //guardar para no perder la sesion al reacargar
                localStorage.setItem('token', res.token);
                localStorage.setItem('username', res.username);
                localStorage.setItem('rol', res.rol);
                if (res.userId) {
                    localStorage.setItem('userId', res.userId);
                }
            }
            )
        );
    }

    logout() {
        localStorage.clear();
    }

    get usuarioActual(): AuthResponse | null {
        const rol = localStorage.getItem('rol');
        const username = localStorage.getItem('username');
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');

        if (!rol || !username || !token) return null;

        return { token, username, rol, userId: userId || undefined };
    }
}