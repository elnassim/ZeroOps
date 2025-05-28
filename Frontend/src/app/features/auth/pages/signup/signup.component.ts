import { Component, type OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AuthService } from '../../../../core/services/auth.service';
import {
  FormBuilder,
  ReactiveFormsModule,
  type FormGroup,
  Validators,
  type AbstractControl,
  type ValidationErrors,
} from "@angular/forms";

enum PasswordStrength {
  Weak = "weak",
  Medium = "medium",
  Strong = "strong",
}

@Component({
  selector: "app-signup",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: "./signup.component.html",
  styleUrls: ["./signup.component.scss"],
})
export class SignupComponent implements OnInit {
  signupForm!: FormGroup;
  isLoading = false;
  hidePassword = true;
  hideConfirmPassword = true;
  errorMessage: string | null = null;
  fieldErrors: Record<string, string[]> = {};
  PasswordStrength = PasswordStrength;

  constructor(private fb: FormBuilder, private authService: AuthService) {}

  ngOnInit(): void {
    this.initForm()
  }

  initForm(): void {
    this.signupForm = this.fb.group(
      {
        firstName: [""],
        lastName: [""],
        email: ["", [Validators.required, Validators.email]],
        password: ["", [Validators.required, Validators.minLength(8), this.passwordValidator]],
        confirmPassword: ["", Validators.required],
        acceptTerms: [false, Validators.requiredTrue],
        rememberMe: [false],
      },
      {
        validators: this.passwordMatchValidator,
      },
    )

    // Listen to password changes to update strength indicator
    this.signupForm.get("password")?.valueChanges.subscribe((value) => {
      this.checkPasswordStrength(value)
    })
  }

  get passwordStrength(): PasswordStrength {
    const password = this.signupForm.get("password")?.value
    return this.checkPasswordStrength(password)
  }

  get passwordStrengthPercent(): number {
    switch (this.passwordStrength) {
      case PasswordStrength.Weak:
        return 33
      case PasswordStrength.Medium:
        return 66
      case PasswordStrength.Strong:
        return 100
      default:
        return 0
    }
  }

  get passwordStrengthColor(): string {
    switch (this.passwordStrength) {
      case PasswordStrength.Weak:
        return "warn"
      case PasswordStrength.Medium:
        return "accent"
      case PasswordStrength.Strong:
        return "primary"
      default:
        return "warn"
    }
  }

  checkPasswordStrength(password: string): PasswordStrength {
    if (!password) return PasswordStrength.Weak

    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    const passwordStrength =
      (hasUpperCase ? 1 : 0) + (hasLowerCase ? 1 : 0) + (hasNumbers ? 1 : 0) + (hasSpecialChars ? 1 : 0)

    if (password.length < 8 || passwordStrength <= 2) {
      return PasswordStrength.Weak
    } else if (password.length >= 8 && passwordStrength === 3) {
      return PasswordStrength.Medium
    } else {
      return PasswordStrength.Strong
    }
  }

  passwordValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value

    if (!value) {
      return null
    }

    const hasUpperCase = /[A-Z]/.test(value)
    const hasLowerCase = /[a-z]/.test(value)
    const hasNumeric = /[0-9]/.test(value)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value)

    const passwordValid = hasUpperCase && hasLowerCase && hasNumeric && hasSpecialChar

    return !passwordValid
      ? {
          passwordStrength: {
            hasUpperCase,
            hasLowerCase,
            hasNumeric,
            hasSpecialChar,
          },
        }
      : null
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get("password")?.value
    const confirmPassword = control.get("confirmPassword")?.value

    if (password && confirmPassword && password !== confirmPassword) {
      control.get("confirmPassword")?.setErrors({ passwordMismatch: true })
      return { passwordMismatch: true }
    }

    return null
  }

  onSubmit(): void {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }
  
    this.isLoading = true;
    this.errorMessage = null;
  
    this.authService.register(this.signupForm.value).subscribe({
      next: (response: any) => {
        console.log('User registered successfully:', response);
        this.isLoading = false;
        // Redirect or show success message
      },
      error: (error: any) => {
        console.error('Error during registration:', error);
        this.errorMessage = 'Registration failed. Please try again.';
        this.isLoading = false;
      },
    });
  }

  getFieldError(fieldName: string): string {
    const control = this.signupForm.get(fieldName)

    if (control?.errors && control.touched) {
      if (control.errors["required"]) {
        return "Ce champ est requis"
      }
      if (control.errors["email"]) {
        return "Veuillez entrer une adresse email valide"
      }
      if (control.errors["minlength"]) {
        return `Minimum ${control.errors["minlength"].requiredLength} caractères requis`
      }
      if (control.errors["passwordStrength"]) {
        return "Le mot de passe doit contenir des majuscules, minuscules, chiffres et caractères spéciaux"
      }
      if (control.errors["passwordMismatch"]) {
        return "Les mots de passe ne correspondent pas"
      }
      if (control.errors["serverError"]) {
        return control.errors["serverError"].join(", ")
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
