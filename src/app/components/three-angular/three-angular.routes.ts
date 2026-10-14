import { Routes } from "@angular/router";
import { provideNgtRenderer } from "angular-three/dom";

export const routes: Routes = [
    {
        path: '',
        providers: [
            provideNgtRenderer()
        ],
        loadComponent: () => import('./three-angular').then(m => m.ThreeAngular)
    }
]