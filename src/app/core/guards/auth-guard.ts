import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('token'); // Revisamos si hay token

  if (token) {
    return true; //hay token
  } else {
    //mno hay token
    router.navigate(['/login']);
    return false; 
  }
};