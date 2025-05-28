import { Component, EventEmitter, Output } from "@angular/core"
import { CommonModule } from "@angular/common"

@Component({
  selector: "app-header",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./header.component.html",
  styleUrls: ["./header.component.scss"],
})
export class HeaderComponent {
  @Output() toggleSidebar = new EventEmitter<void>()
  userMenuOpen = false

  toggleUserMenu() {
    this.userMenuOpen = !this.userMenuOpen
  }
}
