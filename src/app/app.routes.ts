import { Routes } from '@angular/router';
import { Home } from './components/home/home';

export const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        component: Home
    },
    {
        path: 'scene',
        loadChildren: () => import('./components/three-angular/three-angular.routes').then(m => m.routes)
    },
    {
        path: '**',
        redirectTo: ''
    }
];
