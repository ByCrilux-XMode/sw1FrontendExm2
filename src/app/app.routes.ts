import { Routes } from '@angular/router';
import { LoginComponent } from './modules/auth/pages/login/login.component';
import { EditorArchivoComponent } from './modules/organization/pages/editor-archivo/editor-archivo';
import { AdminDashboardComponent } from './modules/organization/pages/admin-dashboard/admin-dashboard.component';
import { authGuard } from './core/guards/auth-guard';
import { GestionUsuariosComponent } from './modules/organization/pages/gestion-usuarios/gestion-usuarios.component';
import { UsuarioFormComponent } from './shared/components/form/usuario-form.component';
import { DepartamentoFormComponent } from './shared/components/form/departamento-form.component';
import { GestionDepartamentosComponent } from './modules/organization/pages/gestion-departamento/gestion-departamentos.component';
import { EditorPoliticas } from './modules/organization/pages/editor-politicas/editor-politicas';
import { ColaboradoresComponent } from './modules/organization/pages/colaboradores/colaboradores.component';
import { GestionPoliticasComponent } from './modules/organization/pages/gestion-politicas/gestion-politicas.component';
import { EjecucionTramiteComponent } from './modules/operations/pages/ejecucion-tramite/ejecucion-tramite.component';
import { DashboardFuncionarioComponent } from './modules/operations/pages/dashboard-funcionario/dashboard-funcionario.component';
import { DetalleTramiteComponent } from './modules/operations/pages/detalle-tramite/detalle-tramite.component';
import { GestionTramitesAdminComponent } from './modules/organization/pages/gestion-tramites-admin/gestion-tramites-admin.component';
import { DynamicReportsComponent } from './modules/reports/pages/dynamic-reports/dynamic-reports.component';
export const routes: Routes = [
    //publico
    { path: 'login', component: LoginComponent },
    //protegido ADMIN
    { path: 'admin/dashboard', component: AdminDashboardComponent, canActivate: [authGuard] },
    { path: 'admin/usuarios', component: GestionUsuariosComponent, canActivate: [authGuard] },
    { path: 'admin/usuarios/nuevo', component: UsuarioFormComponent, canActivate: [authGuard] },
    { path: 'admin/departamentos', component: GestionDepartamentosComponent, canActivate: [authGuard] },
    { path: 'admin/departamentos/nuevo', component: DepartamentoFormComponent, canActivate: [authGuard] },
    { path: 'admin/departamentos/editar/:id', component: DepartamentoFormComponent, canActivate: [authGuard] },
    { path: 'admin/colaboradores', component: ColaboradoresComponent, canActivate: [authGuard] },
    { path: 'admin/politicas', component: GestionPoliticasComponent, canActivate: [authGuard] },
    { path: 'admin/editor/:id', component: EditorPoliticas, canActivate: [authGuard] },
    { path: 'admin/editor-archivo/:id', component: EditorArchivoComponent, canActivate: [authGuard] },
    {
        path: 'funcionario/editor/:id',
        component: EditorArchivoComponent,
        canActivate: [authGuard]
    },
    // Funcionario / Operaciones
    { path: 'funcionario/dashboard', component: DashboardFuncionarioComponent, canActivate: [authGuard] },
    { path: 'funcionario/tramites/:id/ejecutar', component: EjecucionTramiteComponent, canActivate: [authGuard] },
    { path: 'funcionario/tramites/:id/detalle', component: DetalleTramiteComponent, canActivate: [authGuard] },
    {
        path: 'funcionario/detalle-tramite/:id',
        component: DetalleTramiteComponent,
        canActivate: [authGuard]
    },
    // Gestión global de trámites — acceso libre (sin guard)
    { path: 'tramites-control', component: GestionTramitesAdminComponent },
    // Reportes Dinámicos Text-to-Mongo
    { path: 'admin/reportes', component: DynamicReportsComponent, canActivate: [authGuard] },
    //redireccion
    { path: '', redirectTo: 'login', pathMatch: 'full' },
];
