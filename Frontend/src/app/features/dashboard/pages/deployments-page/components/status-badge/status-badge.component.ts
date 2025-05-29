import { Component, Input } from "@angular/core"
import { CommonModule } from "@angular/common"
import type { FrontendDeploymentStatus } from "../../../../models/deployment.model";

@Component({
  selector: "app-status-badge",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./status-badge.component.html",
  styleUrls: ["./status-badge.component.scss"],
})
export class StatusBadgeComponent {
  @Input() status: FrontendDeploymentStatus = 'UNKNOWN';
  get statusText(): string {
    switch (this.status) {
      case "SUCCESS":
      case "DEPLOYED":
        return "Success";
      case "BUILDING":
        return "Building";
      case "FAILED":
      case "ERROR":
        return "Failed";
      case "QUEUED":
        return "Queued";
      case "PENDING":
        return "Pending";
      case "CLONING":
        return "Cloning";
      case "UPLOADING":
        return "Uploading";
      case "UPLOAD_COMPLETE":
        return "Upload Complete";
      case "POLL_ERROR_SERVICE":
        return "Status Error";
      case "UNKNOWN":
      default:
        return "Unknown";
    }
  }
}
