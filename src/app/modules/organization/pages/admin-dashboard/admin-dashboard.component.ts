import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Navbar } from '../../../../shared/components/navbar/navbar'; 

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterModule, Navbar], 
  templateUrl: './admin-dashboard.component.html' // <--- Usando tu nombre exacto
})
export class AdminDashboardComponent {}