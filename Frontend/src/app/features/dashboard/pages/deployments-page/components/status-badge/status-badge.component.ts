import { Component, Input } from "@angular/core"
import { CommonModule } from "@angular/common"

@Component({
  selector: "app-status-badge",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./status-badge.component.html",
  styleUrls: ["./status-badge.component.scss"],
})
export class StatusBadgeComponent {
  @Input() status: "success" | "building" | "failed" = "success"

  get statusText(): string {
    switch (this.status) {
      case "success":
        return "Success"
      case "building":
        return "In Progress"
      case "failed":
        return "Failed"
      default:
        return "Unknown"
    }
  }
}
