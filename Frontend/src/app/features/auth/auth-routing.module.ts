import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { SignupComponent } from './pages/signup/signup.component';
import { publicGuard } from '../../core/guards/public.guard'; // Make sure this path is correct

const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [publicGuard] // APPLY THE GUARD
  },
  {
    path: 'signup',
    component: SignupComponent,
    canActivate: [publicGuard] // APPLY THE GUARD
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AuthRoutingModule {}