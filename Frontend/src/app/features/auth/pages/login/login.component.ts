import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router'; // Import Router
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  imports:[CommonModule,
    ReactiveFormsModule,
    RouterModule],
  selector: "app-login",
  standalone: true,
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.scss"],
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  hidePassword = true;
  isLoading = false;
  errorMessage: string | null = null;
  fieldErrors: {[key: string]: string[]} = {};

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router // Inject Router
  ) {
    this.loginForm = this.initForm();
  }

  ngOnInit(): void {
    // this.initForm()
  }

  initForm(): FormGroup {
    return this.fb.group({
      email: ["", [Validators.required, Validators.email]],
      password: ["", [Validators.required]],
      rememberMe: [false],
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
  
    this.isLoading = true;
    this.errorMessage = null;

    this.authService.login(this.loginForm.value).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Login successful:', response);
        this.router.navigate(['/dashboard']); // Example redirect
      },
      error: (error: any) => { // This is where your error is being caught
        console.error('Error during login:', error);
        this.errorMessage = 'Invalid email or password.';
        if (error.error && typeof error.error === 'string' && error.error.includes("Invalid email or password")) {
            this.errorMessage = "L'email ou le mot de passe est incorrect.";
        } else if (error.status === 0) {
            this.errorMessage = "Impossible de se connecter au serveur. Veuillez vérifier votre connexion.";
        } else {
            this.errorMessage = "Une erreur inattendue s'est produite. Veuillez réessayer.";
        }
        this.isLoading = false;
      },
    });
  }

  getFieldError(fieldName: string): string {
    const control = this.loginForm.get(fieldName)

    if (control?.errors && control.touched) {
      if (control.errors["required"]) {
        return "Ce champ est requis"
      }
      if (control.errors["email"]) {
        return "Veuillez entrer une adresse email valide"
      }
    }

    return ""
  }

  loginWithGoogle(): void {
    console.log("Login with Google")
  }

  loginWithGithub(): void {
    console.log("Login with GitHub")
  }
}
