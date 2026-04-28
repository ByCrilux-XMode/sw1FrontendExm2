//lo que le envio
export interface LoginRequest{
    username: string;
    password: string;

}
//loque el back retorna
export interface AuthResponse{
    token: string;
    username: string;
    rol: string;
    userId?: string;
}