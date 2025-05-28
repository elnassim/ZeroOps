import { Component, Input, type OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"

@Component({
  selector: "app-stats-card",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./stats-card.component.html",
  styleUrls: ["./stats-card.component.scss"],
})
export class StatsCardComponent implements OnInit {
  @Input() title = ""
  @Input() value = ""
  @Input() trend: "up" | "down" | "stable" | null = null
  @Input() trendValue = ""
  @Input() sparklineData = ""
  @Input() icon = ""

  sparklineLastX = 0
  sparklineLastY = 0

  constructor() {}

  ngOnInit(): void {}

  generateSparklinePath(): string {
    if (!this.sparklineData) return ""

    const data = this.sparklineData.split(",").map(Number)
    const max = Math.max(...data)
    const min = Math.min(...data)
    const range = max - min || 1

    const width = 120
    const height = 40
    const padding = 5

    const xStep = (width - padding * 2) / (data.length - 1)

    const points = data.map((value, index) => {
      const x = padding + index * xStep
      const y = height - padding - ((value - min) / range) * (height - padding * 2)

      if (index === data.length - 1) {
        this.sparklineLastX = x
        this.sparklineLastY = y
      }

      return `${x},${y}`
    })

    return `M${points.join(" L")}`
  }
}
